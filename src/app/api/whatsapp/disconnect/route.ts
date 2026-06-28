import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { disconnectWhatsApp } from "@/lib/whatsapp/instance";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await disconnectWhatsApp(session.user.id);
  return NextResponse.json({ ok: true });
}
