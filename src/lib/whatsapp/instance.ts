import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
  type WAMessageUpdate,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { waEmitter } from "./sse-emitter";
import { prisma } from "@/lib/prisma";
import { DeliveryStatus } from "@prisma/client";
import path from "path";
import fs from "fs";

const globalForWA = globalThis as unknown as {
  waSocket: WASocket | undefined;
  waUserId: string | undefined;
};

function sessionDir(userId: string) {
  const dir = path.join(process.cwd(), "wa-sessions", userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function mapStatus(status: number): DeliveryStatus {
  // WAMessageStatus: 0=ERROR 1=PENDING 2=SERVER_ACK(sent) 3=DELIVERY_ACK 4=READ 5=PLAYED
  if (status === 2) return DeliveryStatus.SENT;
  if (status === 3) return DeliveryStatus.DELIVERED;
  if (status === 4 || status === 5) return DeliveryStatus.READ;
  if (status === 0) return DeliveryStatus.FAILED;
  return DeliveryStatus.PENDING;
}

export async function connectWhatsApp(userId: string): Promise<void> {
  // clear stale socket before creating a new one
  globalForWA.waSocket = undefined;
  globalForWA.waUserId = undefined;

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir(userId));

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 10_000,
    retryRequestDelayMs: 250,
  });

  globalForWA.waSocket = sock;
  globalForWA.waUserId = userId;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) waEmitter.emit("qr", qr);
    if (connection) waEmitter.emit("connection", connection);

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        // wipe local session files
        fs.rmSync(sessionDir(userId), { recursive: true, force: true });
        globalForWA.waSocket = undefined;
        globalForWA.waUserId = undefined;
        waEmitter.emit("connection", "loggedOut");
      } else {
        // reconnect on any other close reason
        connectWhatsApp(userId);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.update", async (updates: WAMessageUpdate[]) => {
    for (const { key, update } of updates) {
      if (update.status != null && key.id) {
        const dbStatus = mapStatus(update.status as number);
        await prisma.messageDelivery.updateMany({
          where: { waMessageId: key.id },
          data: { status: dbStatus },
        });
        waEmitter.emit("delivery", { messageId: key.id, status: dbStatus });
      }
    }
  });
}

export async function getPairingCode(phone: string): Promise<string> {
  const sock = globalForWA.waSocket;
  if (!sock) throw new Error("Socket not initialised — call connectWhatsApp first");
  // phone must be digits only, no +, no spaces
  const digits = phone.replace(/\D/g, "");
  const code = await sock.requestPairingCode(digits);
  return code;
}

export function getSocket(): WASocket | undefined {
  return globalForWA.waSocket;
}

export function isConnected(): boolean {
  return !!globalForWA.waSocket;
}

export async function disconnectWhatsApp(userId: string): Promise<void> {
  const sock = globalForWA.waSocket;
  globalForWA.waSocket = undefined;
  globalForWA.waUserId = undefined;
  // wipe local session so next connect shows a fresh QR
  fs.rmSync(sessionDir(userId), { recursive: true, force: true });
  if (sock) {
    try {
      await sock.logout();
    } catch {
      sock.end(undefined);
    }
  }
  waEmitter.emit("connection", "close");
}
