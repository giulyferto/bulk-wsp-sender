"use client";
import { useState, useEffect, useCallback } from "react";

type Status = "PENDING" | "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "SKIPPED" | "CANCELLED";
type Phase = "form" | "sending" | "done" | "cancelled";

interface ContactEntry {
  id: string;
  deliveryId: string;
  name: string;
  phone: string;
  status: Status;
}

interface ContactList {
  id: string;
  name: string;
  _count: { members: number };
}

interface Template {
  id: string;
  name: string;
  body: string;
  imageUrls: string[];
}

const statusConfig: Record<Status, { label: string; cls: string; dot: string; spinner?: boolean }> = {
  PENDING:   { label: "Pendiente",  cls: "bg-gray-100 text-gray-500",    dot: "bg-gray-300" },
  SENDING:   { label: "Enviando…",  cls: "bg-blue-50 text-blue-600",     dot: "bg-blue-500", spinner: true },
  SENT:      { label: "Enviado",    cls: "bg-blue-50 text-blue-600",     dot: "bg-blue-500" },
  DELIVERED: { label: "Entregado",  cls: "bg-amber-50 text-amber-600",   dot: "bg-amber-500" },
  READ:      { label: "Leído",      cls: "bg-accent-muted text-accent",  dot: "bg-accent" },
  FAILED:    { label: "Fallido",    cls: "bg-red-50 text-red-500",       dot: "bg-red-400" },
  SKIPPED:   { label: "Salteado",   cls: "bg-gray-100 text-gray-400",    dot: "bg-gray-300" },
  CANCELLED: { label: "Cancelado",  cls: "bg-gray-100 text-gray-400",    dot: "bg-gray-300" },
};

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150 w-full";

export default function SendPage() {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [listId, setListId] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [phase, setPhase] = useState<Phase>("form");
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);

  const loadLists = useCallback(async () => {
    const res = await fetch("/api/lists");
    setLists(await res.json());
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    loadLists();
    loadTemplates();
  }, [loadLists, loadTemplates]);

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
        setCampaignId(event.campaignId as string);
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
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, message, imageUrls }),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al enviar");
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            handleEvent(JSON.parse(line.slice(6)));
          } catch {
            // skip malformed line
          }
        }
      }
    } catch (err) {
      console.error("[SSE] stream error:", err);
    }

    setLoading(false);
  }

  async function handleCancel() {
    if (!campaignId) return;
    await fetch(`/api/campaigns/${campaignId}/cancel`, { method: "POST" });
  }

  async function handleSkip() {
    if (!campaignId) return;
    await fetch(`/api/campaigns/${campaignId}/skip`, { method: "POST" });
  }

  const selectedList = lists.find((l) => l.id === listId);

  // ── Form ──────────────────────────────────────────────────────────────────
  if (phase === "form") {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Enviar campaña</h1>
          <p className="text-sm text-gray-500 mt-1">
            Los mensajes se envían con un intervalo aleatorio de 3 a 10 segundos entre cada uno
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
          <form onSubmit={handleSend} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Lista de destinatarios
              </label>
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                required
                className={inputCls}
              >
                <option value="">Elegir una lista…</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l._count.members} contactos
                  </option>
                ))}
              </select>
            </div>

            {templates.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Plantilla (opcional)
                </label>
                <select
                  className={inputCls}
                  defaultValue=""
                  onChange={(e) => {
                    const tpl = templates.find((t) => t.id === e.target.value);
                    if (tpl) {
                      setMessage(tpl.body);
                      setImageUrls(tpl.imageUrls ?? []);
                    } else {
                      setImageUrls([]);
                    }
                  }}
                >
                  <option value="">Elegir plantilla…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.imageUrls?.length > 0 ? ` · ${t.imageUrls.length} img` : ""}
                    </option>
                  ))}
                </select>

                {imageUrls.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {imageUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                      />
                    ))}
                    <span className="text-xs text-gray-400 self-center">
                      {imageUrls.length === 1 ? "1 imagen adjunta" : `${imageUrls.length} imágenes adjuntas`}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-gray-500">Mensaje</label>
                <span className="text-xs text-gray-300 tabular-nums">{message.length} car.</span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                className={`${inputCls} resize-none leading-relaxed`}
                placeholder="Escribí tu mensaje acá…"
              />
            </div>

            {selectedList && (
              <div className="bg-accent-muted rounded-lg px-4 py-3 text-sm text-green-800">
                Se enviará a{" "}
                <strong>{selectedList._count.members} contactos</strong> de la lista &ldquo;
                {selectedList.name}&rdquo;.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-lg font-medium text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Iniciando…" : "Enviar campaña"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Live / done / cancelled view ──────────────────────────────────────────
  const isSending = phase === "sending";
  const sentCount = contacts.filter(
    (c) => c.status === "SENT" || c.status === "DELIVERED" || c.status === "READ"
  ).length;
  const pendingCount = contacts.filter(
    (c) => c.status === "PENDING" || c.status === "SENDING"
  ).length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isSending
              ? "Enviando campaña…"
              : phase === "done"
              ? "Campaña enviada"
              : "Campaña cancelada"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedList?.name ?? "—"} &middot; {contacts.length} destinatarios
          </p>
        </div>

        {(phase === "done" || phase === "cancelled") && campaignId && (
          <a
            href={`/campaigns/${campaignId}`}
            className="flex-shrink-0 text-sm bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-accent-dark transition-colors"
          >
            Ver resultados
          </a>
        )}
      </div>

      {/* Progress card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-end gap-8">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Enviados</p>
            <p className="text-3xl font-semibold text-gray-900 tabular-nums mt-1">{sentCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pendientes</p>
            <p className="text-3xl font-semibold text-gray-400 tabular-nums mt-1">{pendingCount}</p>
          </div>
          {isSending && countdown !== null && countdown > 0 && (
            <div className="ml-auto text-right">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Próximo en</p>
              <p className="text-3xl font-semibold text-accent tabular-nums mt-1">{countdown}s</p>
            </div>
          )}
        </div>

        <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{
              width:
                contacts.length > 0
                  ? `${(sentCount / contacts.length) * 100}%`
                  : "0%",
            }}
          />
        </div>
      </div>

      {/* Cancel / skip actions */}
      {isSending && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleSkip}
            className="px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Saltar siguiente
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Cancelar envío
          </button>
        </div>
      )}

      {/* Contact list */}
      {contacts.length === 0 ? (
        <div className="flex justify-center pt-8">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="divide-y divide-gray-50">
            {contacts.map((c) => {
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
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}
                  >
                    {cfg.spinner ? (
                      <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    )}
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Mensaje</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
