import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;
  const snap = await db.collection(`users/${uid}/contacts`).orderBy("name").get();
  const contacts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(contacts);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone } = await req.json();
  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone required" }, { status: 400 });
  }

  const uid = session.user.id;
  const now = new Date();
  const ref = await db.collection(`users/${uid}/contacts`).add({ name, phone, createdAt: now, updatedAt: now });
  return NextResponse.json({ id: ref.id, name, phone, createdAt: now, updatedAt: now }, { status: 201 });
}
