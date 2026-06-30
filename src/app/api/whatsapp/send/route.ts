import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSocket, isConnected } from "@/lib/whatsapp/instance";
import { db } from "@/lib/firebase";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isConnected()) {
    return NextResponse.json({ error: "WhatsApp no está conectado" }, { status: 409 });
  }

  const { listId, message } = await req.json();
  if (!listId || !message) {
    return NextResponse.json({ error: "listId y message son requeridos" }, { status: 400 });
  }

  const uid = session.user.id;
  const listSnap = await db.doc(`users/${uid}/lists/${listId}`).get();
  if (!listSnap.exists) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });

  const listData = listSnap.data()!;
  const memberIds: string[] = listData.memberIds ?? [];

  const contacts = (
    await Promise.all(
      memberIds.map(async (contactId) => {
        const snap = await db.doc(`users/${uid}/contacts/${contactId}`).get();
        return snap.exists ? { id: snap.id, ...(snap.data() as { name: string; phone: string }) } : null;
      })
    )
  ).filter((c): c is { id: string; name: string; phone: string } => c !== null);

  const campaignRef = await db.collection(`users/${uid}/campaigns`).add({
    listId,
    body: message,
    sentAt: new Date(),
  });

  const sock = getSocket()!;

  for (const contact of contacts) {
    const deliveryRef = await db
      .collection(`users/${uid}/campaigns/${campaignRef.id}/deliveries`)
      .add({ contactId: contact.id, status: "PENDING", waMessageId: null, updatedAt: new Date() });

    try {
      const phoneDigits = contact.phone.replace(/\D/g, "");
      const lookup = await sock.onWhatsApp(phoneDigits);
      const info = lookup?.[0];

      if (!info?.exists) {
        await deliveryRef.update({ status: "FAILED", updatedAt: new Date() });
        console.warn(`[send] ${contact.phone} no está en WhatsApp`);
        await sleep(1000);
        continue;
      }

      const sent = await sock.sendMessage(info.jid, { text: message });
      await deliveryRef.update({
        waMessageId: sent?.key.id ?? null,
        status: "SENT",
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error(`[send] error enviando a ${contact.phone}:`, err);
      await deliveryRef.update({ status: "FAILED", updatedAt: new Date() });
    }

    await sleep(1500);
  }

  return NextResponse.json({ campaignId: campaignRef.id });
}
