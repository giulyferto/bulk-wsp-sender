"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";

const EmojiPicker = dynamic(() => import("@emoji-mart/react"), { ssr: false });
const MAX_IMAGES = 3;

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

const WA_BLUE = "#34b7f1";
const WA_GREY = "#8696a0";

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150 w-full";

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
  const [countdownTotal, setCountdownTotal] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [skippingIds, setSkippingIds] = useState<Set<string>>(new Set());
  const [skipConfirmedIds, setSkipConfirmedIds] = useState<Set<string>>(new Set());

  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiPos, setEmojiPos] = useState<{ top: number; left: number } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cursorPosRef = useRef<number>(0);

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

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c !== null && c > 0 ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (phase !== "sending") setSelectedIds(new Set());
  }, [phase]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    if (showEmoji) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji]);

  useEffect(() => {
    if (!showEmoji) return;
    const node = emojiPickerRef.current;
    const button = emojiButtonRef.current;
    if (!node || !button) return;

    const margin = 12;
    function reposition() {
      const buttonRect = button!.getBoundingClientRect();
      const pickerRect = node!.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const openUpward = spaceBelow < pickerRect.height + margin && spaceAbove > spaceBelow;
      let top = openUpward ? buttonRect.top - pickerRect.height - 6 : buttonRect.bottom + 6;
      top = Math.min(Math.max(top, margin), Math.max(margin, viewportH - pickerRect.height - margin));
      let left = buttonRect.left;
      left = Math.min(Math.max(left, margin), Math.max(margin, viewportW - pickerRect.width - margin));
      setEmojiPos({ top, left });
    }

    reposition();
    const ro = new ResizeObserver(reposition);
    ro.observe(node);
    window.addEventListener("resize", reposition);
    return () => { ro.disconnect(); window.removeEventListener("resize", reposition); };
  }, [showEmoji]);

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
        setCampaignId(event.campaignId as string);
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
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!message && imageUrls.length === 0) {
      setError("Escribí un mensaje o agregá al menos una imagen");
      return;
    }
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
    setCancelling(true);
    setSelectedIds(new Set());
    await fetch(`/api/campaigns/${campaignId}/cancel`, { method: "POST" });
  }

  async function handleSkipMany(ids: string[]) {
    if (!campaignId || ids.length === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setSkippingIds((prev) => new Set([...prev, ...ids]));
    await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/campaigns/${campaignId}/skip`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactId: id }),
          });
          if (!res.ok) throw new Error();
          setSkipConfirmedIds((prev) => new Set(prev).add(id));
        } catch {
          setSkippingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      })
    );
  }

  function openEmojiPicker() {
    cursorPosRef.current = textareaRef.current?.selectionStart ?? message.length;
    if (!showEmoji && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPos({ top: rect.bottom + 6, left: rect.left });
    }
    setShowEmoji((v) => !v);
  }

  function onEmojiSelect(emoji: { native: string }) {
    const pos = cursorPosRef.current;
    const next = message.slice(0, pos) + emoji.native + message.slice(pos);
    setMessage(next);
    cursorPosRef.current = pos + emoji.native.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = cursorPosRef.current;
        textareaRef.current.selectionEnd = cursorPosRef.current;
      }
    }, 0);
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) { setError("Solo se permiten archivos de imagen"); return; }
    setUploadingImage(true);
    setError("");
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/images", { method: "POST", body: form });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al subir la imagen");
    } else {
      const { url } = await res.json();
      setImageUrls((prev) => [...prev, url]);
    }
    setUploadingImage(false);
  }

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
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

        <div className="flex gap-10 items-start">
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-gray-500">Mensaje</label>
                  <span className="text-xs text-gray-300 tabular-nums">{message.length} car.</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onBlur={() => { cursorPosRef.current = textareaRef.current?.selectionStart ?? message.length; }}
                  onClick={() => { cursorPosRef.current = textareaRef.current?.selectionStart ?? message.length; }}
                  onKeyUp={() => { cursorPosRef.current = textareaRef.current?.selectionStart ?? message.length; }}
                  rows={6}
                  className={`${inputCls} resize-none leading-relaxed`}
                  placeholder="Escribí tu mensaje acá…"
                />
                <div className="flex items-center mt-2">
                  <button
                    ref={emojiButtonRef}
                    type="button"
                    onClick={openEmojiPicker}
                    className="text-gray-400 hover:text-yellow-500 transition-colors"
                    title="Insertar emoji"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 13s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Images */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500">
                    Imágenes <span className="text-gray-300 font-normal">({imageUrls.length}/{MAX_IMAGES})</span>
                  </label>
                  {imageUrls.length > 0 && imageUrls.length < MAX_IMAGES && !uploadingImage && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-accent transition-colors"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="10" height="10">
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                      Agregar
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
                {imageUrls.length === 0 && !uploadingImage ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-accent hover:text-accent transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-xs">Agregar imagen (opcional)</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(url)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500"
                        >
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="9" height="9">
                            <path d="M12 4L4 12M4 4l8 8" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {uploadingImage && (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl h-24 flex items-center justify-center bg-gray-50">
                        <span className="text-xs text-gray-400">Subiendo…</span>
                      </div>
                    )}
                  </div>
                )}
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

          <div className="hidden lg:block flex-shrink-0 pt-2">
            <WhatsAppPreview body={message} imageUrls={imageUrls} label="Vista previa" />
          </div>
        </div>

        {showEmoji && (
          <div
            ref={emojiPickerRef}
            style={{
              position: "fixed",
              top: emojiPos?.top ?? 0,
              left: emojiPos?.left ?? 0,
              zIndex: 9999,
              visibility: emojiPos ? "visible" : "hidden",
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
            }}
            className="shadow-2xl rounded-xl overflow-hidden"
          >
            <EmojiPicker
              data={data}
              locale="es"
              onEmojiSelect={onEmojiSelect}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
            />
          </div>
        )}
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
  const progressPct = contacts.length > 0 ? (sentCount / contacts.length) * 100 : 0;
  const allSent = contacts.length > 0 && contacts.every(
    (c) => c.status === "SENT" || c.status === "DELIVERED" || c.status === "READ"
  );
  const hasPending = contacts.some((c) => c.status === "PENDING");

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
              ? "Enviando campaña…"
              : phase === "done"
              ? allSent ? "Campaña enviada" : "Campaña finalizada con errores"
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

        {/* Phone preview — sticky alongside the contact list */}
        <div className="hidden lg:block flex-shrink-0 sticky top-8">
          <WhatsAppPreview body={message} imageUrls={imageUrls} label="Mensaje enviado" />
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
