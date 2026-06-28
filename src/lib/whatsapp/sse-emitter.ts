import { EventEmitter } from "events";

const globalForWA = globalThis as unknown as { waEmitter: EventEmitter };

export const waEmitter: EventEmitter =
  globalForWA.waEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForWA.waEmitter = waEmitter;
}

waEmitter.setMaxListeners(50);
