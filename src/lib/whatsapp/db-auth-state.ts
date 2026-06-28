import type { AuthenticationState } from "@whiskeysockets/baileys";
import { BufferJSON, initAuthCreds } from "@whiskeysockets/baileys";
import { prisma } from "@/lib/prisma";

export async function loadDatabaseAuthState(
  userId: string
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const row = await prisma.whatsappSession.findUnique({ where: { userId } });

  const creds: AuthenticationState["creds"] = row?.creds
    ? JSON.parse(JSON.stringify(row.creds), BufferJSON.reviver)
    : initAuthCreds();

  const keys: Record<string, Record<string, unknown>> = row?.keys
    ? JSON.parse(JSON.stringify(row.keys), BufferJSON.reviver)
    : {};

  const state: AuthenticationState = {
    creds,
    keys: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get(type, ids): any {
        const data: Record<string, unknown> = {};
        for (const id of ids) {
          const val = keys[type]?.[id];
          if (val) data[id] = val;
        }
        return data;
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
    await prisma.whatsappSession.upsert({
      where: { userId },
      create: { userId, creds: credsJson, keys: keysJson },
      update: { creds: credsJson, keys: keysJson },
    });
  };

  return { state, saveCreds };
}
