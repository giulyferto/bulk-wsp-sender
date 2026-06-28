"use client";
import { useState, useEffect } from "react";

type ConnStatus = "unknown" | "connecting" | "open" | "close" | "loggedOut";

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
      // format as XXXX-XXXX for readability
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

  const statusLabel: Record<ConnStatus, string> = {
    unknown: "Desconocido",
    connecting: "Conectando...",
    open: "Conectado",
    close: "Desconectado",
    loggedOut: "Sesión cerrada",
  };
  const statusColor: Record<ConnStatus, string> = {
    unknown: "text-gray-500",
    connecting: "text-yellow-600",
    open: "text-green-600",
    close: "text-red-500",
    loggedOut: "text-red-500",
  };

  const connected = status === "open";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Conexión WhatsApp</h1>
      <div className="bg-white border rounded-lg p-6 max-w-sm">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm font-medium text-gray-700">Estado:</span>
          <span className={`text-sm font-semibold ${statusColor[status]}`}>
            {statusLabel[status]}
          </span>
        </div>

        {connected ? (
          <div>
            <p className="text-sm text-green-700 mb-4">
              Tu WhatsApp está conectado y listo para enviar mensajes.
            </p>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="w-full border border-red-500 text-red-500 px-4 py-2 rounded text-sm hover:bg-red-50 disabled:opacity-50"
            >
              {busy ? "Desconectando..." : "Desconectar WhatsApp"}
            </button>
          </div>
        ) : (
          <>
            {/* Primary: pairing code */}
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
              Opción 1 — Código de vinculación (recomendado)
            </p>
            <form onSubmit={handlePairCode} className="space-y-2 mb-5">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+5491155556666"
                required
                className="w-full border rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={busy || status === "connecting"}
                className="w-full bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {busy ? "Generando código..." : "Obtener código"}
              </button>
            </form>

            {pairingCode && (
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-center">
                <p className="text-xs text-gray-600 mb-1">
                  En WhatsApp → Dispositivos vinculados → Vincular con número de teléfono, ingresá:
                </p>
                <p className="text-3xl font-bold tracking-widest text-green-700">
                  {pairingCode}
                </p>
                <p className="text-xs text-gray-500 mt-1">Válido por ~160 segundos</p>
              </div>
            )}

            {/* Secondary: QR */}
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
              Opción 2 — Código QR
            </p>
            <button
              onClick={handleQR}
              disabled={busy || status === "connecting"}
              className="w-full border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50 mb-3"
            >
              {busy ? "Iniciando..." : "Mostrar QR"}
            </button>

            {qrDataUrl && (
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500 mb-2">
                  Escaneá con WhatsApp → Dispositivos vinculados → Vincular un dispositivo
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR de WhatsApp" className="w-56 h-56 mx-auto" />
              </div>
            )}

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
