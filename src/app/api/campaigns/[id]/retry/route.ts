import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSocket, isConnected } from "@/lib/whatsapp/instance";
import { db } from "@/lib/firebase";
import { shouldCancel, shouldSkipContact, clearSignals } from "@/lib/whatsapp/campaign-signals";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function randomDelaySecs(): number {
  return Math.floor(Math.random() * 8) + 3;
}

async function interruptibleSleep(ms: number, campaignId: string): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (shouldCancel(campaignId)) return;
    await sleep(Math.min(100, end - Date.now()));
  }
}

const RETRYABLE = new Set(["FAILED", "PENDING", "CANCELLED", "SKIPPED"]);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (!isConnected()) {
    return new Response(JSON.stringify({ error: "WhatsApp no está conectado" }), { status: 409 });
  }

  const { id: campaignId } = await params;
  const uid = session.user.id;

  const campaignSnap = await db.doc(`users/${uid}/campaigns/${campaignId}`).get();
  if (!campaignSnap.exists) {
    return new Response(JSON.stringify({ error: "Campaña no encontrada" }), { status: 404 });
  }

  const campaignData = campaignSnap.data()!;
  const message: string = campaignData.body ?? "";
  const imageUrls: string[] = campaignData.imageUrls ?? [];

  const deliveriesSnap = await db
    .collection(`users/${uid}/campaigns/${campaignId}/deliveries`)
    .get();

  const retryable = deliveriesSnap.docs.filter((d) => RETRYABLE.has(d.data().status));

  if (retryable.length === 0) {
    return new Response(JSON.stringify({ error: "No hay mensajes para reintentar" }), { status: 400 });
  }

  const entries = (
    await Promise.all(
      retryable.map(async (d) => {
        const contactSnap = await db.doc(`users/${uid}/contacts/${d.data().contactId}`).get();
        if (!contactSnap.exists) return null;
        const c = contactSnap.data() as { name: string; phone: string };
        return { deliveryId: d.id, id: contactSnap.id, name: c.name, phone: c.phone };
      })
    )
  ).filter((e): e is { deliveryId: string; id: string; name: string; phone: string } => e !== null);

  // Reset to PENDING
  await Promise.all(
    entries.map((e) =>
      db.doc(`users/${uid}/campaigns/${campaignId}/deliveries/${e.deliveryId}`).update({
        status: "PENDING",
        waMessageId: null,
        updatedAt: new Date(),
      })
    )
  );

  await campaignSnap.ref.update({ status: "sending" });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // client disconnected
        }
      };

      const sock = getSocket()!;
      let cancelled = false;
      let allSuccess = true;

      try {
        send({
          type: "start",
          body: message,
          imageUrls,
          contacts: entries.map((e) => ({ ...e, status: "PENDING" })),
        });

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const deliveryRef = db.doc(
            `users/${uid}/campaigns/${campaignId}/deliveries/${entry.deliveryId}`
          );

          if (shouldCancel(campaignId)) {
            cancelled = true;
            for (let j = i; j < entries.length; j++) {
              await db
                .doc(`users/${uid}/campaigns/${campaignId}/deliveries/${entries[j].deliveryId}`)
                .update({ status: "CANCELLED", updatedAt: new Date() });
              send({ type: "status", contactId: entries[j].id, status: "CANCELLED" });
            }
            send({ type: "cancelled" });
            break;
          }

          if (shouldSkipContact(campaignId, entry.id)) {
            allSuccess = false;
            await deliveryRef.update({ status: "SKIPPED", updatedAt: new Date() });
            send({ type: "status", contactId: entry.id, status: "SKIPPED" });
            if (i < entries.length - 1) {
              const secs = randomDelaySecs();
              send({ type: "countdown", seconds: secs });
              await interruptibleSleep(secs * 1000, campaignId);
            }
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

              if (message) {
                const sent = await sock.sendMessage(info.jid, { text: message });
                waMessageId = sent?.key.id ?? null;
              }

              for (let j = 0; j < imageUrls.length; j++) {
                if (j > 0 || message) await sleep(600);
                const sent = await sock.sendMessage(info.jid, { image: { url: imageUrls[j] } });
                if (!waMessageId) waMessageId = sent?.key.id ?? null;
              }

              await deliveryRef.update({ waMessageId, status: "SENT", updatedAt: new Date() });
              send({ type: "status", contactId: entry.id, status: "SENT" });
            }
          } catch (err) {
            console.error(`[retry] error enviando a ${entry.phone}:`, err);
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
          await campaignSnap.ref.update({ status: allSuccess ? "done" : "incomplete" });
          send({ type: "done" });
        } else {
          await campaignSnap.ref.update({ status: "cancelled" });
        }
      } catch (err) {
        console.error("[retry stream] error:", err);
        send({ type: "error", message: "Error interno del servidor" });
      } finally {
        clearSignals(campaignId);
        try { controller.close(); } catch {}
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
