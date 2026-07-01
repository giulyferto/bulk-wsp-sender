import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectWhatsApp, getPairingCode, terminateSocket } from "@/lib/whatsapp/instance";
import { waEmitter } from "@/lib/whatsapp/sse-emitter";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const uid = session.user.id;

  // Wipe any stored session so Baileys starts completely fresh and emits QR
  await db.doc(`whatsappSessions/${uid}`).delete();

  // Register the QR listener BEFORE connecting to avoid missing the event
  const codePromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      waEmitter.off("qr", onQr);
      reject(new Error("Tiempo de espera agotado esperando conexión con WhatsApp"));
    }, 45_000);

    const onQr = async () => {
      clearTimeout(timeout);
      waEmitter.off("qr", onQr);
      try {
        const c = await getPairingCode(phone);
        resolve(c);
      } catch (e) {
        reject(e);
      }
    };

    waEmitter.once("qr", onQr);
  });

  // allowReconnect=false: if pairing never reaches "open", don't loop in "connecting"
  await connectWhatsApp(uid, false);

  try {
    const code = await codePromise;
    return NextResponse.json({ code });
  } catch (err) {
    // Make sure UI doesn't get stuck in "connecting" on failure
    terminateSocket();
    const msg = err instanceof Error ? err.message : "Error al generar el código";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
