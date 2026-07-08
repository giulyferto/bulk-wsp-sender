"use client";
import { useState, useEffect } from "react";

type ConnStatus = "unknown" | "connecting" | "open" | "close" | "loggedOut";

const statusConfig: Record<ConnStatus, { label: string; dot: string; text: string }> = {
  unknown:    { label: "Desconocido",   dot: "bg-gray-400",   text: "text-gray-500" },
  connecting: { label: "Conectando…",   dot: "bg-amber-400 animate-pulse", text: "text-amber-600" },
  open:       { label: "Conectado",     dot: "bg-accent animate-pulse",    text: "text-accent" },
  close:      { label: "Desconectado",  dot: "bg-red-400",    text: "text-red-500" },
  loggedOut:  { label: "Sesión cerrada", dot: "bg-red-400",   text: "text-red-500" },
};

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150 w-full";

export default function WhatsAppPage() {
  const [status, setStatus] = useState<ConnStatus>("unknown");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const es = new EventSource("/api/whatsapp/status");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "qr") {
        setQrDataUrl(data.dataUrl);
        setStatus("connecting");
      } else if (data.type === "connection") {
        setStatus(data.status as ConnStatus);
        if (data.status === "open") {
          setQrDataUrl(null);
          setPairingCode(null);
        }
      }
    };
    return () => es.close();
  }, []);

  // Safety net: if we're stuck in "connecting" for too long (e.g. a dropped
  // SSE message), fall back to "close" so the buttons unlock and the user
  // can retry instead of being stuck forever.
  useEffect(() => {
    if (status !== "connecting") return;
    const t = setTimeout(() => setStatus("close"), 90_000);
    return () => clearTimeout(t);
  }, [status]);

  async function handlePairCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setPairingCode(null);
    setQrDataUrl(null);
    const res = await fetch("/api/whatsapp/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al generar el código");
    } else {
      const raw: string = data.code ?? "";
      setPairingCode(raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw);
    }
    setBusy(false);
  }

  async function handleQR() {
    setBusy(true);
    setError("");
    setPairingCode(null);
    await fetch("/api/whatsapp/connect", { method: "POST" });
    setBusy(false);
  }

  async function handleDisconnect() {
    setBusy(true);
    await fetch("/api/whatsapp/disconnect", { method: "POST" });
    setPairingCode(null);
    setQrDataUrl(null);
    setBusy(false);
  }

  const cfg = statusConfig[status];
  const connected = status === "open";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Conexión WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-1">Vinculá tu número para empezar a enviar mensajes</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-sm">
        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-6 pb-5 border-b border-gray-100">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
        </div>

        {connected ? (
          <div className="space-y-4">
            <div className="bg-accent-muted rounded-lg p-4 text-sm text-green-800">
              Tu WhatsApp está activo y listo para enviar mensajes.
            </div>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="w-full border border-red-200 text-red-500 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
            >
              {busy ? "Desconectando…" : "Desconectar WhatsApp"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pairing code */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Opción 1 — Código de vinculación
              </p>
              <form onSubmit={handlePairCode} className="space-y-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+5491155556666"
                  required
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={busy || status === "connecting"}
                  className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50"
                >
                  {busy ? "Generando código…" : "Obtener código"}
                </button>
              </form>

              {pairingCode && (
                <div className="mt-3 bg-accent-muted rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-2">
                    WhatsApp → Dispositivos vinculados → Vincular con número de teléfono
                  </p>
                  <p className="text-3xl font-bold tracking-[0.2em] text-accent font-mono">
                    {pairingCode}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Válido por ~160 s</p>
                </div>
              )}
            </div>

            {/* QR code */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Opción 2 — Código QR
              </p>
              <button
                onClick={handleQR}
                disabled={busy || status === "connecting"}
                className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50"
              >
                {busy ? "Iniciando…" : "Mostrar QR"}
              </button>

              {qrDataUrl && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-400 mb-2">
                    WhatsApp → Dispositivos vinculados → Vincular un dispositivo
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR de WhatsApp" className="w-52 h-52 mx-auto rounded-lg" />
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
