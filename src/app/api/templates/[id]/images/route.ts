import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getStorageBucket } from "@/lib/firebase";
import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const uid = session.user.id;

  const templateRef = db.doc(`users/${uid}/templates/${id}`);
  const templateSnap = await templateRef.get();
  if (!templateSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentUrls: string[] = templateSnap.data()?.imageUrls ?? [];
  if (currentUrls.length >= 3) {
    return NextResponse.json({ error: "Máximo 3 imágenes por plantilla" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `templates/${uid}/${id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const token = randomUUID();

  const bucket = getStorageBucket();
  await bucket.file(storagePath).save(buffer, {
    metadata: {
      contentType: file.type,
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  const bucketName = bucket.name;
  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

  await templateRef.update({
    imageUrls: [...currentUrls, downloadUrl],
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ url: downloadUrl });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const imageUrl: string = body.url;
  if (!imageUrl) return NextResponse.json({ error: "url required" }, { status: 400 });

  const templateRef = db.doc(`users/${uid}/templates/${id}`);
  const templateSnap = await templateRef.get();
  if (!templateSnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const match = new URL(imageUrl).pathname.match(/\/o\/(.+)/);
    if (match) await getStorageBucket().file(decodeURIComponent(match[1])).delete();
  } catch {
    // best-effort: storage deletion errors don't block the DB update
  }

  const currentUrls: string[] = templateSnap.data()?.imageUrls ?? [];
  await templateRef.update({
    imageUrls: currentUrls.filter((u) => u !== imageUrl),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
