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

const WA_BLUE = "#34b7f1";
const WA_GREY = "#8696a0";

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3.5 3.5L13 4.5" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 8h8" />
    </svg>
  );
}

function Ticks({ double, color }: { double?: boolean; color: string }) {
  return (
    <svg viewBox="0 0 16 11" width="15" height="10" fill="none" aria-hidden="true">
      {double && (
        <path d="M0.5 5.6L3.6 8.8L9.3 1.3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
      <path d="M3.7 5.6L6.8 8.8L15.5 1.3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FailedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5v4M8 11h.01" />
    </svg>
  );
}

function statusDisplay(status: Status): { icon: React.ReactNode; label: string; tone: string } {
  switch (status) {
    case "READ":
      return { icon: <Ticks double color={WA_BLUE} />, label: "Leído", tone: "text-gray-400" };
    case "DELIVERED":
      return { icon: <Ticks double color={WA_GREY} />, label: "Entregado", tone: "text-gray-400" };
    case "SENT":
      return { icon: <Ticks color={WA_GREY} />, label: "Enviado", tone: "text-gray-400" };
    case "SENDING":
      return {
        icon: <span className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />,
        label: "Enviando…",
        tone: "text-accent",
      };
    case "FAILED":
      return { icon: <FailedIcon />, label: "Fallido", tone: "text-red-500" };
    case "SKIPPED":
      return { icon: <DashIcon />, label: "Salteado", tone: "text-gray-300" };
    case "CANCELLED":
      return { icon: <DashIcon />, label: "Cancelado", tone: "text-gray-300" };
    default:
      return { icon: null, label: "Pendiente", tone: "text-gray-300" };
  }
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 21;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const offset = c * (1 - pct);
  return (
    <div className="relative w-14 h-14 flex-shrink-0" role="img" aria-label={`Próximo envío en ${seconds} segundos`}>
      <svg viewBox="0 0 48 48" width="56" height="56" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#22c281"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-mono font-semibold text-gray-700 tabular-nums">
        {seconds}s
      </div>
    </div>
  );
}

export default function RetryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [phase, setPhase] = useState<Phase>("connecting");
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [body, setBody] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownTotal, setCountdownTotal] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());
  const [skipConfirmedIds, setSkipConfirmedIds] = useState<Set<string>>(new Set());
  const started = useRef(false);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c !== null && c > 0 ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (phase !== "sending") setSelectedIds(new Set());
  }, [phase]);

  function updateStatus(contactId: string, status: Status) {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, status } : c)));
  }

  function dropFromSelection(contactId: string) {
    setSelectedIds((prev) => {
      if (!prev.has(contactId)) return prev;
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
  }

  function toggleSelect(contactId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  function handleEvent(event: Record<string, unknown>) {
    switch (event.type) {
      case "start":
        setBody((event.body as string) ?? "");
        setImageUrls((event.imageUrls as string[]) ?? []);
        setContacts(event.contacts as ContactEntry[]);
        setPhase("sending");
        break;
      case "sending":
        updateStatus(event.contactId as string, "SENDING");
        dropFromSelection(event.contactId as string);
        setCountdown(null);
        setCountdownTotal(null);
        break;
      case "status":
        updateStatus(event.contactId as string, event.status as Status);
        dropFromSelection(event.contactId as string);
        break;
      case "countdown":
        setCountdown(event.seconds as number);
        setCountdownTotal(event.seconds as number);
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
    if (cancelling) return;
    setCancelling(true);
    setSelectedIds(new Set());
    await fetch(`/api/campaigns/${id}/cancel`, { method: "POST" });
  }

  async function handleSkipMany(ids: string[]) {
    if (ids.length === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setSkippingIds((prev) => new Set([...prev, ...ids]));
    await Promise.all(
      ids.map(async (contactId) => {
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
      })
    );
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
  const hasPending = contacts.some((c) => c.status === "PENDING");

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
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2.5">
            {isSending && (
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
            )}
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
            className="flex-shrink-0 text-sm bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-accent-dark transition-colors"
          >
            Ver campaña
          </a>
        )}
      </div>

      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0">
          {/* Status strip */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-end gap-8">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Enviados</p>
                  <p className="text-4xl font-bold text-gray-900 font-mono tabular-nums mt-1">{sentCount}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pendientes</p>
                  <p className="text-4xl font-bold text-gray-300 font-mono tabular-nums mt-1">{pendingCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                {isSending && countdown !== null && countdown > 0 && (
                  <CountdownRing seconds={countdown} total={countdownTotal ?? countdown} />
                )}
                {isSending && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="px-3.5 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {cancelling ? "Cancelando…" : "Cancelar envío"}
                  </button>
                )}
              </div>
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

          {/* Contact list */}
          {contacts.length === 0 ? (
            <div className="flex justify-center pt-8">
              <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {isSending && hasPending && !cancelling && (
                <div className="px-5 py-2.5 border-b border-gray-50 bg-gray-50/60">
                  <p className="text-xs text-gray-400">
                    Tocá uno o varios contactos pendientes para omitirlos del envío.
                  </p>
                </div>
              )}
              <div className="divide-y divide-gray-50">
                {contacts.map((c) => {
                  const isSkipping = skippingIds.has(c.id);
                  const isSkipConfirmed = skipConfirmedIds.has(c.id);
                  const selectable = isSending && c.status === "PENDING" && !cancelling && !isSkipping && !isSkipConfirmed;
                  const isSelected = selectedIds.has(c.id);
                  const willSkip = isSelected || isSkipping || isSkipConfirmed;
                  const showCancellingBadge = cancelling && c.status === "PENDING" && !willSkip;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (selectable) toggleSelect(c.id);
                      }}
                      className={`group flex items-center px-5 py-3.5 gap-3 transition-colors duration-100 ${
                        selectable ? "cursor-pointer" : ""
                      } ${isSelected ? "bg-accent-muted/50" : "hover:bg-gray-50/50"}`}
                      style={isSelected ? { boxShadow: "inset 3px 0 0 0 #22c281" } : undefined}
                    >
                      <div className="w-[18px] h-[18px] flex-shrink-0">
                        {selectable || willSkip ? (
                          <button
                            type="button"
                            disabled={!selectable}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectable) toggleSelect(c.id);
                            }}
                            aria-pressed={isSelected}
                            aria-label={isSelected ? `Deseleccionar a ${c.name}` : `Seleccionar a ${c.name}`}
                            className={`w-full h-full rounded-md border-2 flex items-center justify-center transition-colors ${
                              willSkip
                                ? "bg-accent border-accent text-white"
                                : "border-gray-300 text-transparent group-hover:border-gray-400 hover:border-accent/60"
                            } ${!selectable ? "cursor-default" : ""}`}
                          >
                            <CheckIcon />
                          </button>
                        ) : null}
                      </div>

                      <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0 text-accent font-semibold text-xs">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{c.phone}</div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 justify-end">
                        {willSkip ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              isSkipConfirmed ? "bg-accent-muted text-accent" : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {isSkipping && !isSkipConfirmed ? (
                              <span className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
                            ) : (
                              <CheckIcon />
                            )}
                            Se omitirá
                          </span>
                        ) : selectable ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSkipMany([c.id]);
                              }}
                              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-xs font-medium text-gray-400 hover:text-red-500 transition-opacity px-2 py-1 rounded-md hover:bg-red-50"
                            >
                              Omitir
                            </button>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              Pendiente
                            </span>
                          </>
                        ) : showCancellingBadge ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse" />
                            Cancelando…
                          </span>
                        ) : (
                          (() => {
                            const r = statusDisplay(c.status);
                            return (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${r.tone}`}>
                                {r.icon}
                                {r.label}
                              </span>
                            );
                          })()
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

      {/* Floating bulk-skip bar */}
      {isSending && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-0 right-0 lg:left-56 flex justify-center z-20 px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4 bg-gray-900 text-white rounded-xl shadow-lg px-5 py-3 animate-[slide-up_0.2s_ease-out]">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? "contacto seleccionado" : "contactos seleccionados"}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Deseleccionar
            </button>
            <button
              onClick={() => handleSkipMany(Array.from(selectedIds))}
              className="text-sm font-medium bg-white text-gray-900 px-3.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Omitir seleccionados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
