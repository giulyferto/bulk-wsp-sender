"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";

type Status = "PENDING" | "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "SKIPPED" | "CANCELLED";
type Phase = "connecting" | "sending" | "done" | "cancelled" | "error";

interface ContactEntry {
  id: string;
  deliveryId: string;
  name: string;
  phone: string;
  status: Status;
}

const statusConfig: Record<Status, { label: string; cls: string; dot: string; spinner?: boolean }> = {
  PENDING:   { label: "Pendiente",  cls: "bg-gray-100 text-gray-500",   dot: "bg-gray-300" },
  SENDING:   { label: "Enviando…",  cls: "bg-blue-50 text-blue-600",    dot: "bg-blue-500", spinner: true },
  SENT:      { label: "Enviado",    cls: "bg-blue-50 text-blue-600",    dot: "bg-blue-500" },
  DELIVERED: { label: "Entregado",  cls: "bg-amber-50 text-amber-600",  dot: "bg-amber-500" },
  READ:      { label: "Leído",      cls: "bg-accent-muted text-accent", dot: "bg-accent" },
  FAILED:    { label: "Fallido",    cls: "bg-red-50 text-red-500",      dot: "bg-red-400" },
  SKIPPED:   { label: "Salteado",   cls: "bg-gray-100 text-gray-400",   dot: "bg-gray-300" },
  CANCELLED: { label: "Cancelado",  cls: "bg-gray-100 text-gray-400",   dot: "bg-gray-300" },
};

export default function RetryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [phase, setPhase] = useState<Phase>("connecting");
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [body, setBody] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());
  const [skipConfirmedIds, setSkipConfirmedIds] = useState<Set<string>>(new Set());
  const started = useRef(false);

  // Countdown tick
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c !== null && c > 0 ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function updateStatus(contactId: string, status: Status) {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, status } : c)));
  }

  function handleEvent(event: Record<string, unknown>) {
    switch (event.type) {
      case "start":
        setBody(event.body as string ?? "");
        setImageUrls(event.imageUrls as string[] ?? []);
        setContacts(event.contacts as ContactEntry[]);
        setPhase("sending");
        break;
      case "sending":
        updateStatus(event.contactId as string, "SENDING");
        setCountdown(null);
        break;
      case "status":
        updateStatus(event.contactId as string, event.status as Status);
        break;
      case "countdown":
        setCountdown(event.seconds as number);
        break;
      case "done":
        setCountdown(null);
        setPhase("done");
        break;
      case "cancelled":
        setCountdown(null);
        setPhase("cancelled");
        break;
      case "error":
        setErrorMsg((event.message as string) ?? "Error desconocido");
        setPhase("error");
        break;
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    fetch(`/api/campaigns/${id}/retry`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.error ?? "Error al iniciar el reintento");
          setPhase("error");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try { handleEvent(JSON.parse(line.slice(6))); } catch {}
          }
        }
      })
      .catch(() => {
        setErrorMsg("No se pudo conectar con el servidor");
        setPhase("error");
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancel() {
    setCancelling(true);
    await fetch(`/api/campaigns/${id}/cancel`, { method: "POST" });
  }

  async function handleSkip(contactId: string) {
    setSkippingIds((prev) => new Set(prev).add(contactId));
    try {
      const res = await fetch(`/api/campaigns/${id}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) throw new Error();
      setSkipConfirmedIds((prev) => new Set(prev).add(contactId));
    } catch {
      setSkippingIds((prev) => {
        const next = new Set(prev);
        next.delete(contactId);
        return next;
      });
    }
  }

  const isSending = phase === "sending";
  const sentCount = contacts.filter(
    (c) => c.status === "SENT" || c.status === "DELIVERED" || c.status === "READ"
  ).length;
  const pendingCount = contacts.filter(
    (c) => c.status === "PENDING" || c.status === "SENDING"
  ).length;
  const progressPct = contacts.length > 0 ? (sentCount / contacts.length) * 100 : 0;
  const allSent = contacts.length > 0 && contacts.every(
    (c) => c.status === "SENT" || c.status === "DELIVERED" || c.status === "READ"
  );

  if (phase === "connecting") {
    return (
      <div className="flex items-center justify-center pt-20 gap-3 text-sm text-gray-400">
        <span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        Iniciando reintento…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="text-center pt-12">
        <p className="text-sm text-red-400 mb-3">{errorMsg}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-accent hover:underline"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isSending
              ? "Reintentando campaña…"
              : phase === "done"
              ? allSent ? "Reintento completado" : "Reintento finalizado con errores"
              : "Reintento cancelado"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {contacts.length} destinatario{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>

        {(phase === "done" || phase === "cancelled") && (
          <a
            href={`/campaigns/${id}`}
            className="flex-shrink-0 text-sm bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Ver campaña
          </a>
        )}
      </div>

      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0">
          {/* Progress card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
            <div className="flex items-end gap-8">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Enviados</p>
                <p className="text-4xl font-bold text-gray-900 tabular-nums mt-1">{sentCount}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pendientes</p>
                <p className="text-4xl font-bold text-gray-300 tabular-nums mt-1">{pendingCount}</p>
              </div>
              {isSending && countdown !== null && countdown > 0 && (
                <div className="ml-auto text-right">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Próximo en</p>
                  <p className="text-4xl font-bold text-accent tabular-nums mt-1">{countdown}s</p>
                </div>
              )}
            </div>

            <div className="mt-5 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  boxShadow: progressPct > 0 ? "0 0 10px rgba(34,194,129,0.45)" : "none",
                }}
              />
            </div>
          </div>

          {/* Cancel action */}
          {isSending && (
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelling ? "Cancelando…" : "Cancelar envío"}
              </button>
            </div>
          )}

          {/* Contact list */}
          {contacts.length === 0 ? (
            <div className="flex justify-center pt-8">
              <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {contacts.map((c) => {
                  const isPending = c.status === "PENDING";
                  const isSkipping = skippingIds.has(c.id);
                  const isSkipConfirmed = skipConfirmedIds.has(c.id);
                  const showCancellingBadge = cancelling && isPending && !isSkipping;
                  const cfg = statusConfig[c.status];
                  return (
                    <div
                      key={c.id}
                      className="flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/50 transition-colors duration-100"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0 text-accent font-semibold text-xs">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{c.phone}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSending && isPending && !cancelling && (
                          <button
                            onClick={() => handleSkip(c.id)}
                            disabled={isSkipping}
                            title={isSkipConfirmed ? "Se omitirá este contacto" : "Omitir este contacto"}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              isSkipConfirmed
                                ? "text-accent bg-accent-muted cursor-default"
                                : "text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-40"
                            }`}
                          >
                            {isSkipConfirmed ? (
                              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 8.5l3.5 3.5L13 4.5" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M3 3l10 10M13 3L3 13" />
                              </svg>
                            )}
                          </button>
                        )}
                        {showCancellingBadge ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse" />
                            Cancelando…
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
                            {cfg.spinner ? (
                              <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            )}
                            {cfg.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Phone preview */}
        <div className="hidden lg:block flex-shrink-0 sticky top-8">
          <WhatsAppPreview body={body} imageUrls={imageUrls} label="Mensaje enviado" />
        </div>
      </div>
    </div>
  );
}
