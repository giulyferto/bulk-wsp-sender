import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getStorageBucket } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const uid = session.user.id;

  const snap = await db.doc(`users/${uid}/templates/${id}`).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ id: snap.id, ...snap.data() });
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
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    updates.name = name;
  }
  if (typeof body.body === "string") {
    updates.body = body.body;
  }

  await db.doc(`users/${uid}/templates/${id}`).update(updates);
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

  const ref = db.doc(`users/${uid}/templates/${id}`);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const imageUrls: string[] = snap.data()?.imageUrls ?? [];
  await Promise.all(
    imageUrls.map(async (url) => {
      try {
        const match = new URL(url).pathname.match(/\/o\/(.+)/);
        if (match) await getStorageBucket().file(decodeURIComponent(match[1])).delete();
      } catch {
        // best-effort
      }
    })
  );

  await ref.delete();
  return NextResponse.json({ ok: true });
}
