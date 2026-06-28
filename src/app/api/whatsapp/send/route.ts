import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSocket, isConnected } from "@/lib/whatsapp/instance";
import { prisma } from "@/lib/prisma";

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

  const list = await prisma.contactList.findFirst({
    where: { id: listId, userId: session.user.id },
    include: { members: { include: { contact: true } } },
  });

  if (!list) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });

  const campaign = await prisma.campaign.create({
    data: { listId, body: message },
  });

  const sock = getSocket()!;

  for (const member of list.members) {
    const contact = member.contact;
    const delivery = await prisma.messageDelivery.create({
      data: { campaignId: campaign.id, contactId: contact.id },
    });

    try {
      // resolve the correct JID from WhatsApp's servers
      const phoneDigits = contact.phone.replace(/\D/g, "");
      const lookup = await sock.onWhatsApp(phoneDigits);
      const info = lookup?.[0];

      if (!info?.exists) {
        await prisma.messageDelivery.update({
          where: { id: delivery.id },
          data: { status: "FAILED" },
        });
        console.warn(`[send] ${contact.phone} no está en WhatsApp`);
        await sleep(1000);
        continue;
      }

      const sent = await sock.sendMessage(info.jid, { text: message });
      await prisma.messageDelivery.update({
        where: { id: delivery.id },
        data: { waMessageId: sent?.key.id ?? null, status: "SENT" },
      });
    } catch (err) {
      console.error(`[send] error enviando a ${contact.phone}:`, err);
      await prisma.messageDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED" },
      });
    }

    await sleep(1500);
  }

  return NextResponse.json({ campaignId: campaign.id });
}
