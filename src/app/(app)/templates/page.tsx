"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";

interface Template {
  id: string;
  name: string;
  body: string;
  imageUrls: string[];
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="12" height="12">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

function ImageBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-medium">
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="9" height="9">
        <rect x="1" y="1" width="12" height="12" rx="2" />
        <circle cx="4.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
        <path d="M1 9.5l3-3 2.5 2.5 2-2 3 3" />
      </svg>
      {count}
    </span>
  );
}

function GhostPhone() {
  return (
    <div style={{
      background: "#18181b",
      borderRadius: "36px",
      padding: "8px",
      boxShadow: "0 0 0 1.5px #3f3f46, 0 16px 32px rgba(0,0,0,0.1)",
      width: "256px",
      opacity: 0.3,
    }}>
      <div style={{
        background: "#e5ddd5",
        borderRadius: "28px",
        height: "400px",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ background: "#075e54", height: "58px", borderRadius: "28px 28px 0 0" }} />
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "12px 10px",
          flexDirection: "column",
        }}>
          <div style={{
            border: "2px dashed rgba(0,0,0,0.12)",
            borderRadius: "8px 8px 0 8px",
            padding: "12px 16px",
            maxWidth: "80%",
            alignSelf: "flex-end",
          }}>
            <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.25)", margin: 0 }}>
              Seleccioná una plantilla
            </p>
          </div>
        </div>
        <div style={{ background: "#f0f0f0", height: "40px", borderRadius: "0 0 28px 28px" }} />
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const load = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setCreating(false);
    if (res.ok) {
      const created = await res.json();
      setName("");
      setShowCreate(false);
      router.push(`/templates/${created.id}`);
    }
  }

  async function deleteTemplate() {
    if (!confirmDelete) return;
    setDeleting(true);
    await fetch(`/api/templates/${confirmDelete.id}`, { method: "DELETE" });
    if (selectedId === confirmDelete.id) setSelectedId(null);
    setDeleting(false);
    setConfirmDelete(null);
    load();
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Plantillas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mensajes reutilizables con texto e imágenes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
        >
          <PlusIcon />
          Nueva plantilla
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <WhatsAppPreview body="" />
          <p className="mt-6 text-sm font-medium text-gray-700">No hay plantillas todavía</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Creá tu primer mensaje reutilizable</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
          >
            <PlusIcon />
            Crear primera plantilla
          </button>
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Template list */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {templates.map((t) => {
                  const isSelected = selectedId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedId(isSelected ? null : t.id)}
                      className={`flex items-center px-4 py-3.5 gap-3 cursor-pointer transition-colors duration-100 border-l-2 ${
                        isSelected
                          ? "bg-accent-muted border-accent"
                          : "border-transparent hover:bg-gray-50/60"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate ${isSelected ? "text-accent-dark" : "text-gray-900"}`}>
                          {t.name}
                        </div>
                        {t.body ? (
                          <div className="text-xs text-gray-400 mt-0.5 truncate">{t.body}</div>
                        ) : (
                          <div className="text-xs text-gray-300 mt-0.5 italic">Sin mensaje</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {t.imageUrls?.length > 0 && <ImageBadge count={t.imageUrls.length} />}
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(t); }}
                          className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                          title="Eliminar"
                        >
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="10" height="10">
                            <path d="M12 4L4 12M4 4l8 8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preview pane */}
          <div className="flex-1 flex flex-col items-center py-4 min-h-[480px] justify-center">
            {selected ? (
              <div className="flex flex-col items-center">
                <WhatsAppPreview
                  body={selected.body ?? ""}
                  imageUrls={selected.imageUrls ?? []}
                  label={selected.name}
                />
                <button
                  onClick={() => router.push(`/templates/${selected.id}`)}
                  className="mt-5 inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
                >
                  Editar plantilla
                  <ChevronIcon />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <GhostPhone />
                <p className="mt-4 text-xs text-gray-400">Seleccioná una plantilla para previsualizarla</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget && !creating) setShowCreate(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Nueva plantilla</h2>
            <form onSubmit={createTemplate}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150"
                placeholder="Ej: Promo julio"
              />
              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setName(""); }}
                  disabled={creating}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? "Creando…" : "Crear y editar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmDelete(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Eliminar plantilla</h2>
            <p className="text-sm text-gray-500 mb-5">
              ¿Seguro que querés eliminar <strong className="text-gray-800">{confirmDelete.name}</strong>?{" "}
              {confirmDelete.imageUrls?.length > 0 && "Se eliminarán también las imágenes asociadas. "}
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={deleteTemplate}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
