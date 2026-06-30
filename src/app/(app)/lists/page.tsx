"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ContactList {
  id: string;
  name: string;
  _count: { members: number };
}

interface Contact {
  id: string;
  name: string;
  phone: string;
}

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150";

const btnPrimary =
  "bg-accent hover:bg-accent-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

function BatchSplitModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [baseName, setBaseName] = useState("");
  const [batchSize, setBatchSize] = useState(150);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [step, setStep] = useState<"preview" | "creating" | "done">("preview");
  const [progress, setProgress] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then(setContacts);
  }, []);

  const size = Math.max(1, batchSize || 1);
  const batchList: Contact[][] =
    contacts && contacts.length > 0
      ? Array.from({ length: Math.ceil(contacts.length / size) }, (_, i) =>
          contacts.slice(i * size, (i + 1) * size)
        )
      : [];

  async function createBatches() {
    if (!contacts || !baseName.trim() || batchList.length === 0) return;
    setStep("creating");
    setTotalBatches(batchList.length);
    setProgress(0);

    for (let i = 0; i < batchList.length; i++) {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${baseName.trim()} ${i + 1}` }),
      });
      const list = await res.json();
      await fetch(`/api/lists/${list.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: batchList[i].map((c) => c.id) }),
      });
      setProgress(i + 1);
    }

    setStep("done");
    onDone();
  }

  const canCreate = !!baseName.trim() && !!contacts && contacts.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && step !== "creating" && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Dividir contactos en lotes</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {contacts === null
                  ? "Cargando contactos…"
                  : `${contacts.length} contactos en total`}
              </p>
            </div>
            {step !== "creating" && (
              <button
                onClick={onClose}
                className="text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none ml-4 mt-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {step === "done" ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {totalBatches} lista{totalBatches !== 1 ? "s" : ""} creada{totalBatches !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-gray-400 mb-6">Los contactos fueron distribuidos correctamente.</p>
            <button onClick={onClose} className={btnPrimary}>
              Listo
            </button>
          </div>
        ) : step === "creating" ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <p className="text-sm font-medium text-gray-900 mb-4">Creando listas…</p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(progress / totalBatches) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {progress} de {totalBatches}
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4 flex-shrink-0">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Nombre base
                </label>
                <input
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  className={`${inputCls} w-full`}
                  placeholder="Campaña julio"
                  autoFocus
                />
                {baseName.trim() && batchList.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5 font-mono">
                    {baseName.trim()} 1
                    {batchList.length > 1 && (
                      <span className="text-gray-300"> … {baseName.trim()} {batchList.length}</span>
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Contactos por lote
                </label>
                <input
                  type="number"
                  value={batchSize}
                  min={1}
                  max={150}
                  onChange={(e) => setBatchSize(Math.min(150, Math.max(1, Number(e.target.value))))}
                  className={`${inputCls} w-28`}
                />
                <p className="text-xs text-gray-400 mt-1.5">Máximo 150 por lista</p>
              </div>
            </div>

            {contacts !== null && contacts.length > 0 && (
              <div className="px-6 pb-2 overflow-y-auto flex-1">
                <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">
                  Vista previa — {batchList.length} lista{batchList.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-2.5">
                  {batchList.map((batch, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-300 w-5 text-right font-mono flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-accent h-1.5 rounded-full"
                          style={{ width: `${(batch.length / size) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-24 text-right flex-shrink-0">
                        {batch.length} contacto{batch.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contacts !== null && contacts.length === 0 && (
              <div className="px-6 pb-6 text-center text-sm text-gray-400">
                No hay contactos para dividir.
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                onClick={onClose}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createBatches}
                disabled={!canCreate}
                className={btnPrimary}
              >
                Crear{" "}
                {batchList.length > 0
                  ? `${batchList.length} lista${batchList.length !== 1 ? "s" : ""}`
                  : "listas"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ContactList | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/lists");
    setLists(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setLoading(false);
    load();
  }

  async function deleteList() {
    if (!confirmDelete) return;
    await fetch(`/api/lists/${confirmDelete.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Listas</h1>
          <p className="text-sm text-gray-500 mt-1">Agrupá tus contactos para envíos masivos</p>
        </div>
        <button
          onClick={() => setShowBatchModal(true)}
          className="flex-shrink-0 border border-gray-200 text-gray-600 hover:border-accent hover:text-accent px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
        >
          Dividir en lotes
        </button>
      </div>

      <form onSubmit={createList} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Nueva lista</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
              placeholder="Clientes agosto"
            />
          </div>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Creando…" : "Crear lista"}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {lists.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Todavía no hay listas. Creá una arriba.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lists.map((l) => (
              <div
                key={l.id}
                onClick={() => router.push(`/lists/${l.id}`)}
                className="flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/50 transition-colors duration-100 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">{l.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{l._count.members} contactos</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(l); }}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors font-medium"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Eliminar lista</h2>
            <p className="text-sm text-gray-500 mb-5">
              ¿Seguro que querés eliminar <strong className="text-gray-800">{confirmDelete.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={deleteList}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchModal && (
        <BatchSplitModal
          onClose={() => setShowBatchModal(false)}
          onDone={() => { load(); }}
        />
      )}
    </div>
  );
}
