import makeWASocket, {
  DisconnectReason,
  type WASocket,
  type WAMessageUpdate,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { waEmitter } from "./sse-emitter";
import { loadDatabaseAuthState } from "./db-auth-state";
import { db } from "@/lib/firebase";

const globalForWA = globalThis as unknown as {
  waSocket: WASocket | undefined;
  waUserId: string | undefined;
};

type DeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

function mapStatus(status: number): DeliveryStatus {
  // WAMessageStatus: 0=ERROR 1=PENDING 2=SERVER_ACK(sent) 3=DELIVERY_ACK 4=READ 5=PLAYED
  if (status === 2) return "SENT";
  if (status === 3) return "DELIVERED";
  if (status === 4 || status === 5) return "READ";
  if (status === 0) return "FAILED";
  return "PENDING";
}

export async function connectWhatsApp(userId: string): Promise<void> {
  globalForWA.waSocket = undefined;
  globalForWA.waUserId = undefined;

  const { state, saveCreds } = await loadDatabaseAuthState(userId);

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
        // wipe Firestore session so next connect shows a fresh QR
        await db.doc(`whatsappSessions/${userId}`).delete();
        globalForWA.waSocket = undefined;
        globalForWA.waUserId = undefined;
        waEmitter.emit("connection", "loggedOut");
      } else {
        connectWhatsApp(userId);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.update", async (updates: WAMessageUpdate[]) => {
    const uid = globalForWA.waUserId;
    if (!uid) return;

    for (const { key, update } of updates) {
      if (update.status != null && key.id) {
        const dbStatus = mapStatus(update.status as number);
        // Collection group query across all deliveries for this user
        const snap = await db
          .collectionGroup("deliveries")
          .where("waMessageId", "==", key.id)
          .get();
        for (const doc of snap.docs) {
          if (doc.ref.path.startsWith(`users/${uid}/`)) {
            await doc.ref.update({ status: dbStatus, updatedAt: new Date() });
          }
        }
        waEmitter.emit("delivery", { messageId: key.id, status: dbStatus });
      }
    }
  });
}

export async function getPairingCode(phone: string): Promise<string> {
  const sock = globalForWA.waSocket;
  if (!sock) throw new Error("Socket not initialised — call connectWhatsApp first");
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
  await db.doc(`whatsappSessions/${userId}`).delete();
  if (sock) {
    try {
      await sock.logout();
    } catch {
      sock.end(undefined);
    }
  }
  waEmitter.emit("connection", "close");
}
