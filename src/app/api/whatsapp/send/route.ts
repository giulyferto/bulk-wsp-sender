import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSocket, isConnected } from "@/lib/whatsapp/instance";
import { db } from "@/lib/firebase";
import { shouldCancel, shouldSkipContact, clearSignals } from "@/lib/whatsapp/campaign-signals";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function randomDelaySecs(): number {
  return Math.floor(Math.random() * 8) + 3; // 3–10 s
}

async function interruptibleSleep(ms: number, campaignId: string): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (shouldCancel(campaignId)) return;
    await sleep(Math.min(100, end - Date.now()));
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (!isConnected()) {
    return new Response(JSON.stringify({ error: "WhatsApp no está conectado" }), { status: 409 });
  }

  const body = await req.json();
  const { listId, message, imageUrls = [] }: { listId: string; message: string; imageUrls: string[] } = body;
  if (!listId || (!message && imageUrls.length === 0)) {
    return new Response(JSON.stringify({ error: "listId y message (o imágenes) son requeridos" }), { status: 400 });
  }

  const uid = session.user.id;
  const listSnap = await db.doc(`users/${uid}/lists/${listId}`).get();
  if (!listSnap.exists) {
    return new Response(JSON.stringify({ error: "Lista no encontrada" }), { status: 404 });
  }

  const listData = listSnap.data()!;
  const memberIds: string[] = listData.memberIds ?? [];

  const contacts = (
    await Promise.all(
      memberIds.map(async (contactId) => {
        const snap = await db.doc(`users/${uid}/contacts/${contactId}`).get();
        return snap.exists
          ? { id: snap.id, ...(snap.data() as { name: string; phone: string }) }
          : null;
      })
    )
  ).filter((c): c is { id: string; name: string; phone: string } => c !== null);

  const campaignRef = await db.collection(`users/${uid}/campaigns`).add({
    listId,
    listName: listData.name ?? "",
    body: message,
    imageUrls,
    sentAt: new Date(),
    status: "sending",
  });
  const campaignId = campaignRef.id;

  // Create all delivery docs upfront so the start event can carry the full list
  const deliveryRefs = await Promise.all(
    contacts.map((c) =>
      db.collection(`users/${uid}/campaigns/${campaignId}/deliveries`).add({
        contactId: c.id,
        status: "PENDING",
        waMessageId: null,
        updatedAt: new Date(),
      })
    )
  );

  const entries = contacts.map((c, i) => ({ ...c, deliveryId: deliveryRefs[i].id }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // client disconnected — keep sending to Firestore
        }
      };

      const sock = getSocket()!;
      let cancelled = false;
      let allSuccess = true;

      try {
        send({
          type: "start",
          campaignId,
          contacts: entries.map((e) => ({
            id: e.id,
            deliveryId: e.deliveryId,
            name: e.name,
            phone: e.phone,
            status: "PENDING",
          })),
        });

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const deliveryRef = db.doc(
            `users/${uid}/campaigns/${campaignId}/deliveries/${entry.deliveryId}`
          );

          if (shouldCancel(campaignId)) {
            cancelled = true;
            for (let j = i; j < entries.length; j++) {
              const rem = entries[j];
              await db
                .doc(`users/${uid}/campaigns/${campaignId}/deliveries/${rem.deliveryId}`)
                .update({ status: "CANCELLED", updatedAt: new Date() });
              send({ type: "status", contactId: rem.id, status: "CANCELLED" });
            }
            send({ type: "cancelled" });
            break;
          }

          if (shouldSkipContact(campaignId, entry.id)) {
            allSuccess = false;
            await deliveryRef.update({ status: "SKIPPED", updatedAt: new Date() });
            send({ type: "status", contactId: entry.id, status: "SKIPPED" });
            continue;
          }

          send({ type: "sending", contactId: entry.id });

          try {
            const digits = entry.phone.replace(/\D/g, "");
            const lookup = await sock.onWhatsApp(digits);
            const info = lookup?.[0];

            if (!info?.exists) {
              allSuccess = false;
              await deliveryRef.update({ status: "FAILED", updatedAt: new Date() });
              send({ type: "status", contactId: entry.id, status: "FAILED" });
            } else {
              let waMessageId: string | null = null;

              // Always send text first
              if (message) {
                const sent = await sock.sendMessage(info.jid, { text: message });
                waMessageId = sent?.key.id ?? null;
              }

              // Then send each image as a separate message
              for (let j = 0; j < imageUrls.length; j++) {
                if (j > 0 || message) await sleep(600);
                const sent = await sock.sendMessage(info.jid, { image: { url: imageUrls[j] } });
                if (!waMessageId) waMessageId = sent?.key.id ?? null;
              }

              await deliveryRef.update({
                waMessageId,
                status: "SENT",
                updatedAt: new Date(),
              });
              send({ type: "status", contactId: entry.id, status: "SENT" });
            }
          } catch (err) {
            console.error(`[send] error enviando a ${entry.phone}:`, err);
            allSuccess = false;
            await deliveryRef.update({ status: "FAILED", updatedAt: new Date() });
            send({ type: "status", contactId: entry.id, status: "FAILED" });
          }

          if (i < entries.length - 1 && !shouldCancel(campaignId)) {
            const secs = randomDelaySecs();
            send({ type: "countdown", seconds: secs });
            await interruptibleSleep(secs * 1000, campaignId);
          }
        }

        if (!cancelled) {
          await campaignRef.update({ status: allSuccess ? "done" : "incomplete" });
          send({ type: "done", campaignId });
        } else {
          await campaignRef.update({ status: "cancelled" });
        }
      } catch (err) {
        console.error("[send stream] error:", err);
        send({ type: "error", message: "Error interno del servidor" });
      } finally {
        clearSignals(campaignId);
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
