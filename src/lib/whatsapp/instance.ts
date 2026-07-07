import makeWASocket, {
  DisconnectReason,
  type WASocket,
  type WAMessageUpdate,
} from "@whiskeysockets/baileys";
import { waEmitter } from "./sse-emitter";
import { loadDatabaseAuthState } from "./db-auth-state";
import { db } from "@/lib/firebase";

const globalForWA = globalThis as unknown as {
  waSocket: WASocket | undefined;
  waUserId: string | undefined;
  waConnectionState: "open" | "close" | "connecting";
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

/**
 * @param allowReconnect - When false the socket will NOT auto-reconnect if it
 *   closes before ever reaching "open" (used during the pairing flow so a
 *   failed pairing attempt doesn't loop forever in "connecting" state).
 *   Once the connection reaches "open" at least once, auto-reconnect is always
 *   enabled regardless of this flag.
 */
export async function connectWhatsApp(userId: string, allowReconnect = true): Promise<void> {
  const prev = globalForWA.waSocket;
  globalForWA.waSocket = undefined;
  globalForWA.waUserId = undefined;
  globalForWA.waConnectionState = "connecting";
  if (prev) {
    try { prev.end(undefined); } catch {}
  }

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

  let wasOpen = false;

  sock.ev.on("connection.update", async (update) => {
    if (globalForWA.waSocket !== sock) return;

    const { connection, lastDisconnect, qr } = update;
    if (qr) waEmitter.emit("qr", qr);

    if (connection) {
      if (connection === "open") {
        wasOpen = true;
        globalForWA.waConnectionState = "open";
      } else if (connection === "connecting") {
        globalForWA.waConnectionState = "connecting";
      } else if (connection === "close") {
        globalForWA.waConnectionState = "close";
      }
      waEmitter.emit("connection", connection);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        await db.doc(`whatsappSessions/${userId}`).delete();
        globalForWA.waSocket = undefined;
        globalForWA.waUserId = undefined;
        globalForWA.waConnectionState = "close";
        waEmitter.emit("connection", "loggedOut");
      } else if (wasOpen || allowReconnect) {
        // Reconnect if we had a live session before, or if caller allows it.
        // Always pass true so subsequent reconnects keep auto-reconnecting.
        connectWhatsApp(userId, true);
      }
      // allowReconnect=false and never opened → stay closed; UI shows "Desconectado"
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.update", async (updates: WAMessageUpdate[]) => {
    const uid = globalForWA.waUserId;
    if (!uid) return;

    for (const { key, update } of updates) {
      if (update.status != null && key.id) {
        const dbStatus = mapStatus(update.status as number);
        try {
          const snap = await db
            .collectionGroup("deliveries")
            .where("waMessageId", "==", key.id)
            .get();
          for (const doc of snap.docs) {
            if (doc.ref.path.startsWith(`users/${uid}/`)) {
              await doc.ref.update({ status: dbStatus, updatedAt: new Date() });
            }
          }
        } catch (err) {
          console.error("[messages.update] failed to persist delivery status:", err);
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
  return globalForWA.waConnectionState === "open";
}

export function getConnectionState(): "open" | "close" | "connecting" {
  return globalForWA.waConnectionState ?? "close";
}

export function terminateSocket(): void {
  const sock = globalForWA.waSocket;
  globalForWA.waSocket = undefined;
  globalForWA.waUserId = undefined;
  globalForWA.waConnectionState = "close";
  if (sock) {
    try { sock.end(undefined); } catch {}
  }
  waEmitter.emit("connection", "close");
}

export async function disconnectWhatsApp(userId: string): Promise<void> {
  const sock = globalForWA.waSocket;
  globalForWA.waSocket = undefined;
  globalForWA.waUserId = undefined;
  globalForWA.waConnectionState = "close";
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
