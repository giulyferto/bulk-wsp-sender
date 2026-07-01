import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { skipContact } from "@/lib/whatsapp/campaign-signals";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { contactId } = await req.json().catch(() => ({}));
  if (!contactId) return NextResponse.json({ error: "contactId requerido" }, { status: 400 });

  skipContact(id, contactId);
  return NextResponse.json({ ok: true });
}
