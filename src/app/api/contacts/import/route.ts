import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";

interface ParsedContact {
  name: string;
  phone: string;
}

function parseVcf(text: string): ParsedContact[] {
  // Unfold lines (RFC 6350 §3.2: continuation lines start with whitespace)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const contacts: ParsedContact[] = [];
  let current: Partial<ParsedContact> = {};
  let inCard = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.toUpperCase() === "BEGIN:VCARD") {
      inCard = true;
      current = {};
      continue;
    }
    if (line.toUpperCase() === "END:VCARD") {
      inCard = false;
      if (current.name && current.phone) {
        contacts.push({ name: current.name, phone: current.phone });
      }
      continue;
    }
    if (!inCard) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const keyPart = line.slice(0, colonIdx).toUpperCase();
    const value = line.slice(colonIdx + 1).trim();

    // FN is the formatted/display name
    if (keyPart === "FN" || keyPart.startsWith("FN;")) {
      current.name = value;
    }

    // TEL — take first phone found; handles TEL;TYPE=..., TEL;waid=..., etc.
    if (!current.phone && (keyPart === "TEL" || keyPart.startsWith("TEL;"))) {
      const normalized = normalizePhone(value);
      if (normalized) current.phone = normalized;
    }
  }

  return contacts;
}

function normalizePhone(raw: string): string | null {
  // Strip visual separators but keep leading + or digits
  let digits = raw.replace(/[\s\-().]/g, "");

  // 00-prefixed international → +
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);

  // Already has + → likely E.164
  if (digits.startsWith("+")) {
    const e164 = "+" + digits.slice(1).replace(/\D/g, "");
    return e164.length >= 8 ? e164 : null;
  }

  // Bare digits — prepend +
  const bare = digits.replace(/\D/g, "");
  return bare.length >= 7 ? "+" + bare : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await (file as File).text();
  const parsed = parseVcf(text);

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No valid contacts found in file" }, { status: 400 });
  }

  const uid = session.user.id;
  const col = db.collection(`users/${uid}/contacts`);
  const now = new Date();

  // Firestore batch limit is 500 — chunk if needed
  let imported = 0;
  const chunkSize = 500;
  for (let i = 0; i < parsed.length; i += chunkSize) {
    const batch = db.batch();
    for (const c of parsed.slice(i, i + chunkSize)) {
      batch.set(col.doc(), { name: c.name, phone: c.phone, createdAt: now, updatedAt: now });
    }
    await batch.commit();
    imported += Math.min(chunkSize, parsed.length - i);
  }

  return NextResponse.json({ imported, total: parsed.length });
}
