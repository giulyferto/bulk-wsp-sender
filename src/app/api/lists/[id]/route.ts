import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const uid = session.user.id;

  const listSnap = await db.doc(`users/${uid}/lists/${id}`).get();
  if (!listSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const listData = listSnap.data()!;
  const memberIds: string[] = listData.memberIds ?? [];

  const contacts = memberIds.length
    ? await Promise.all(
        memberIds.map(async (contactId) => {
          const snap = await db.doc(`users/${uid}/contacts/${contactId}`).get();
          return snap.exists ? { id: snap.id, ...snap.data() } : null;
        })
      ).then((results) => results.filter(Boolean))
    : [];

  return NextResponse.json({
    id: listSnap.id,
    ...listData,
    members: contacts.map((c) => ({ contact: c })),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const uid = session.user.id;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  await db.doc(`users/${uid}/lists/${id}`).update({ name });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const uid = session.user.id;
  await db.doc(`users/${uid}/lists/${id}`).delete();
  return NextResponse.json({ ok: true });
}
