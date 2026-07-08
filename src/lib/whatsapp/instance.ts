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
  waReconnectAttempts: number;
};

// Caps how many times we auto-reconnect a socket that has never reached "open".
// Without this, a QR/pairing attempt that never completes (expired QR, phone
// offline, etc.) retries instantly forever and the UI stays stuck showing
// "Conectando…" since the buttons are disabled while status === "connecting".
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 2_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

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
        globalForWA.waReconnectAttempts = 0;
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
        globalForWA.waReconnectAttempts = 0;
        waEmitter.emit("connection", "loggedOut");
      } else if (reason === DisconnectReason.restartRequired) {
        // Expected mid-pairing/QR step (WA closes the socket once after saving
        // creds, before a fresh socket can reach "open"). Always retry this one,
        // even when allowReconnect=false, but still bounded in case a corrupted
        // session loops on restartRequired forever instead of ever opening.
        globalForWA.waReconnectAttempts = (globalForWA.waReconnectAttempts ?? 0) + 1;
        if (globalForWA.waReconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
          connectWhatsApp(userId, true);
        } else {
          globalForWA.waReconnectAttempts = 0;
        }
      } else if (wasOpen) {
        // A previously-live session dropped (e.g. network blip) — keep trying
        // to restore it indefinitely, with a small delay to avoid a busy loop.
        setTimeout(() => connectWhatsApp(userId, true), RECONNECT_BASE_DELAY_MS);
      } else if (allowReconnect) {
        // Never reached "open" yet. Retry with backoff, but give up after
        // MAX_RECONNECT_ATTEMPTS so the UI leaves "connecting" and the user
        // can press "Mostrar QR" / "Obtener código" again.
        globalForWA.waReconnectAttempts = (globalForWA.waReconnectAttempts ?? 0) + 1;
        if (globalForWA.waReconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            RECONNECT_BASE_DELAY_MS * globalForWA.waReconnectAttempts,
            RECONNECT_MAX_DELAY_MS,
          );
          setTimeout(() => connectWhatsApp(userId, true), delay);
        } else {
          globalForWA.waReconnectAttempts = 0;
        }
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
