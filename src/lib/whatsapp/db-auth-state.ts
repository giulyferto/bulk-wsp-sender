import type { AuthenticationState } from "@whiskeysockets/baileys";
import { BufferJSON, initAuthCreds } from "@whiskeysockets/baileys";
import { db } from "@/lib/firebase";

export async function loadDatabaseAuthState(
  userId: string
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const ref = db.doc(`whatsappSessions/${userId}`);
  const snap = await ref.get();
  const data = snap.data();

  const creds: AuthenticationState["creds"] = data?.creds
    ? JSON.parse(JSON.stringify(data.creds), BufferJSON.reviver)
    : initAuthCreds();

  const keys: Record<string, Record<string, unknown>> = data?.keys
    ? JSON.parse(JSON.stringify(data.keys), BufferJSON.reviver)
    : {};

  const state: AuthenticationState = {
    creds,
    keys: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get(type, ids): any {
        const result: Record<string, unknown> = {};
        for (const id of ids) {
          const val = keys[type]?.[id];
          if (val) result[id] = val;
        }
        return result;
      },
      set(data) {
        for (const [type, values] of Object.entries(data)) {
          if (!keys[type]) keys[type] = {};
          Object.assign(keys[type], values);
        }
      },
    },
  };

  const saveCreds = async () => {
    const credsJson = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    const keysJson = JSON.parse(JSON.stringify(keys, BufferJSON.replacer));
    await ref.set({ creds: credsJson, keys: keysJson, updatedAt: new Date() }, { merge: true });
  };

  return { state, saveCreds };
}
