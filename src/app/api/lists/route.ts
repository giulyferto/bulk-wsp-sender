import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;
  const snap = await db.collection(`users/${uid}/lists`).orderBy("createdAt", "desc").get();
  const lists = snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, _count: { members: (data.memberIds ?? []).length } };
  });
  return NextResponse.json(lists);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const uid = session.user.id;
  const now = new Date();
  const ref = await db.collection(`users/${uid}/lists`).add({ name, createdAt: now, memberIds: [] });
  return NextResponse.json({ id: ref.id, name, createdAt: now, memberIds: [] }, { status: 201 });
}
