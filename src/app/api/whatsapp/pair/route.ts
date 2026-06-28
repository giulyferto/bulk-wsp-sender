import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectWhatsApp, getPairingCode } from "@/lib/whatsapp/instance";
import { waEmitter } from "@/lib/whatsapp/sse-emitter";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  await connectWhatsApp(session.user.id);

  // requestPairingCode must be called once the socket emits a QR (i.e. WA is ready)
  const code = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      waEmitter.off("qr", onQr);
      reject(new Error("Timed out waiting for WA connection"));
    }, 30_000);

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

  return NextResponse.json({ code });
}
