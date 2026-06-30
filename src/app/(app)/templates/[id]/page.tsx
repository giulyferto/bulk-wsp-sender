"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";

const EmojiPicker = dynamic(() => import("@emoji-mart/react"), { ssr: false });

const MAX_IMAGES = 3;

interface Template {
  id: string;
  name: string;
  body: string;
  imageUrls: string[];
}

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{children}</p>
  );
}

export default function TemplateDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [error, setError] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [bodyValue, setBodyValue] = useState("");
  const [savingBody, setSavingBody] = useState(false);
  const [bodySaved, setBodySaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiPos, setEmojiPos] = useState({ top: 0, left: 0 });
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const cursorPosRef = useRef<number>(0);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/templates/${id}`);
    if (res.ok) {
      const d = await res.json();
      setTemplate(d);
      setBodyValue(d.body ?? "");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    if (showEmoji) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji]);

  function openEmojiPicker() {
    cursorPosRef.current = textareaRef.current?.selectionStart ?? bodyValue.length;
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPos({ top: rect.bottom + 6, left: rect.left });
    }
    setShowEmoji((v) => !v);
  }

  function onEmojiSelect(emoji: { native: string }) {
    const pos = cursorPosRef.current;
    const next = bodyValue.slice(0, pos) + emoji.native + bodyValue.slice(pos);
    setBodyValue(next);
    cursorPosRef.current = pos + emoji.native.length;
    setBodySaved(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = cursorPosRef.current;
        textareaRef.current.selectionEnd = cursorPosRef.current;
      }
    }, 0);
  }

  function startEditName() {
    setNameValue(template?.name ?? "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 40);
  }

  async function saveEditName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === template?.name) { setEditingName(false); return; }
    setSavingName(true);
    const res = await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) await load();
    else setError("Error al guardar el nombre");
    setSavingName(false);
    setEditingName(false);
  }

  async function saveBody() {
    setSavingBody(true);
    setBodySaved(false);
    const res = await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: bodyValue }),
    });
    if (res.ok) {
      await load();
      setBodySaved(true);
      setTimeout(() => setBodySaved(false), 2000);
    } else {
      setError("Error al guardar el mensaje");
    }
    setSavingBody(false);
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
    const res = await fetch(`/api/templates/${id}/images`, { method: "POST", body: form });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al subir la imagen");
    } else {
      await load();
    }
    setUploadingImage(false);
  }

  async function removeImage(url: string) {
    setRemovingUrl(url);
    setError("");
    const res = await fetch(`/api/templates/${id}/images`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al eliminar la imagen");
    } else {
      await load();
    }
    setRemovingUrl(null);
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center pt-20 text-sm text-gray-400">
        Cargando plantilla…
      </div>
    );
  }

  const imageCount = template.imageUrls?.length ?? 0;
  const canAddImage = imageCount < MAX_IMAGES && !uploadingImage;

  return (
    <div>
      {/* Back nav */}
      <Link
        href="/templates"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5 group"
      >
        <span className="w-7 h-7 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center group-hover:border-gray-300 transition-colors">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <path d="M10 12L6 8l4-4" />
          </svg>
        </span>
        Plantillas
      </Link>

      {/* Name */}
      <div className="mb-7">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEditName();
                if (e.key === "Escape") setEditingName(false);
              }}
              disabled={savingName}
              className="text-2xl font-bold text-gray-900 border-b-2 border-accent bg-transparent focus:outline-none w-full min-w-0"
            />
            <button onClick={saveEditName} disabled={savingName} className="text-xs font-medium text-accent hover:text-accent-dark disabled:opacity-50 transition-colors flex-shrink-0">
              {savingName ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => setEditingName(false)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{template.name}</h1>
            <button
              onClick={startEditName}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
              title="Editar nombre"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Two-column layout: editor + live preview */}
      <div className="flex gap-8 items-start">
        {/* Editor column */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Body section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <SectionLabel>Mensaje</SectionLabel>
            <textarea
              ref={textareaRef}
              value={bodyValue}
              onChange={(e) => { setBodyValue(e.target.value); setBodySaved(false); }}
              onBlur={() => { cursorPosRef.current = textareaRef.current?.selectionStart ?? bodyValue.length; }}
              onClick={() => { cursorPosRef.current = textareaRef.current?.selectionStart ?? bodyValue.length; }}
              onKeyUp={() => { cursorPosRef.current = textareaRef.current?.selectionStart ?? bodyValue.length; }}
              rows={7}
              placeholder="Escribí el cuerpo del mensaje…"
              className={`${inputCls} w-full resize-none`}
            />

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{bodyValue.length} caracteres</span>
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
              <div className="flex items-center gap-3">
                {bodySaved && (
                  <span className="text-xs text-green-600 font-medium">Guardado</span>
                )}
                <button
                  onClick={saveBody}
                  disabled={savingBody}
                  className="bg-accent hover:bg-accent-dark disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {savingBody ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>

          {/* Images section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <SectionLabel>Imágenes</SectionLabel>
                <p className="text-xs text-gray-400 -mt-2">{imageCount} de {MAX_IMAGES}</p>
              </div>
              {canAddImage && imageCount > 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-accent hover:text-accent px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="11" height="11">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  Agregar
                </button>
              )}
              {uploadingImage && <span className="text-xs text-gray-400">Subiendo…</span>}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />

            {imageCount === 0 && !uploadingImage ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-accent hover:text-accent transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-sm">Subir imagen</span>
                <span className="text-xs opacity-70">PNG, JPG, WEBP · hasta {MAX_IMAGES} imágenes</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {template.imageUrls.map((url) => (
                  <div key={url} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className={`w-full h-28 object-cover transition-opacity ${removingUrl === url ? "opacity-40" : ""}`}
                    />
                    <button
                      onClick={() => removeImage(url)}
                      disabled={!!removingUrl}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="9" height="9">
                        <path d="M12 4L4 12M4 4l8 8" />
                      </svg>
                    </button>
                    {removingUrl === url && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-white bg-black/50 rounded px-2 py-1">Eliminando…</span>
                      </div>
                    )}
                  </div>
                ))}
                {uploadingImage && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl h-28 flex items-center justify-center bg-gray-50">
                    <span className="text-xs text-gray-400">Subiendo…</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live preview column */}
        <div className="hidden lg:flex flex-col items-center pt-1 flex-shrink-0 sticky top-8">
          <WhatsAppPreview
            body={bodyValue}
            imageUrls={template.imageUrls ?? []}
            label="Vista previa en vivo"
          />
        </div>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div
          ref={emojiPickerRef}
          style={{ position: "fixed", top: emojiPos.top, left: emojiPos.left, zIndex: 9999 }}
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
