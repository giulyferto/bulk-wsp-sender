import { NextResponse } from "next/server";
import { adminAuth, db } from "@/lib/firebase";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  try {
    await adminAuth.getUserByEmail(email);
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  } catch {
    // user not found — proceed
  }

  const userRecord = await adminAuth.createUser({ email, password });
  await db.doc(`users/${userRecord.uid}`).set({ email, createdAt: new Date() });
  return NextResponse.json({ id: userRecord.uid, email }, { status: 201 });
}
