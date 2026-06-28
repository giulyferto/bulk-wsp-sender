import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactListId } = await params;
  const { contactId } = await req.json();

  // verify list belongs to user
  const list = await prisma.contactList.findFirst({
    where: { id: contactListId, userId: session.user.id },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contactListMember.upsert({
    where: { contactId_contactListId: { contactId, contactListId } },
    create: { contactId, contactListId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactListId } = await params;
  const { contactId } = await req.json();

  const list = await prisma.contactList.findFirst({
    where: { id: contactListId, userId: session.user.id },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contactListMember.delete({
    where: { contactId_contactListId: { contactId, contactListId } },
  });
  return NextResponse.json({ ok: true });
}
