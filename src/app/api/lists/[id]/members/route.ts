import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: listId } = await params;
  const body = await req.json();
  const contactIds: string[] = body.contactIds ?? (body.contactId ? [body.contactId] : []);
  if (contactIds.length === 0) return NextResponse.json({ error: "contactId or contactIds required" }, { status: 400 });
  const uid = session.user.id;

  const listSnap = await db.doc(`users/${uid}/lists/${listId}`).get();
  if (!listSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.doc(`users/${uid}/lists/${listId}`).update({
    memberIds: FieldValue.arrayUnion(...contactIds),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: listId } = await params;
  const { contactId } = await req.json();
  const uid = session.user.id;

  const listSnap = await db.doc(`users/${uid}/lists/${listId}`).get();
  if (!listSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.doc(`users/${uid}/lists/${listId}`).update({
    memberIds: FieldValue.arrayRemove(contactId),
  });
  return NextResponse.json({ ok: true });
}
