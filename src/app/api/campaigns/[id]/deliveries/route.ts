import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const uid = session.user.id;

  const campaignSnap = await db.doc(`users/${uid}/campaigns/${id}`).get();
  if (!campaignSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const campaignData = campaignSnap.data()!;

  const listSnap = await db.doc(`users/${uid}/lists/${campaignData.listId}`).get();
  const listData = listSnap.data();

  const deliveriesSnap = await db
    .collection(`users/${uid}/campaigns/${id}/deliveries`)
    .get();

  const deliveries = await Promise.all(
    deliveriesSnap.docs.map(async (d) => {
      const data = d.data();
      const contactSnap = await db.doc(`users/${uid}/contacts/${data.contactId}`).get();
      const contact = contactSnap.data() ?? { name: "Unknown", phone: "" };
      return {
        id: d.id,
        status: data.status,
        contact: { name: contact.name, phone: contact.phone },
      };
    })
  );

  deliveries.sort((a, b) => a.contact.name.localeCompare(b.contact.name));

  return NextResponse.json({
    id: campaignSnap.id,
    ...campaignData,
    sentAt: campaignData.sentAt?.toDate?.()?.toISOString() ?? campaignData.sentAt,
    list: { name: listData?.name ?? "" },
    deliveries,
  });
}
