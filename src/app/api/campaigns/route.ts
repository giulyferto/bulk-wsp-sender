import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;
  const snap = await db
    .collection(`users/${uid}/campaigns`)
    .orderBy("sentAt", "desc")
    .get();

  const campaigns = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      listId: data.listId,
      listName: data.listName ?? "",
      body: data.body ?? "",
      sentAt: data.sentAt?.toDate?.()?.toISOString() ?? data.sentAt,
      status: data.status ?? "done",
    };
  });

  return NextResponse.json(campaigns);
}
