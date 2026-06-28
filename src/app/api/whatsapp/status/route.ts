import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { waEmitter } from "@/lib/whatsapp/sse-emitter";
import { isConnected } from "@/lib/whatsapp/instance";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // send current state immediately
      send({ type: "connection", status: isConnected() ? "open" : "close" });

      const onQr = async (qr: string) => {
        const dataUrl = await QRCode.toDataURL(qr);
        send({ type: "qr", dataUrl });
      };

      const onConn = (status: string) => {
        send({ type: "connection", status });
      };

      const onDelivery = (payload: { messageId: string; status: string }) => {
        send({ type: "delivery", ...payload });
      };

      waEmitter.on("qr", onQr);
      waEmitter.on("connection", onConn);
      waEmitter.on("delivery", onDelivery);

      req.signal.addEventListener("abort", () => {
        waEmitter.off("qr", onQr);
        waEmitter.off("connection", onConn);
        waEmitter.off("delivery", onDelivery);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
