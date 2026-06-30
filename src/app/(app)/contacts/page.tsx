"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface Contact {
  id: string;
  name: string;
  phone: string;
}

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150";

const btnPrimary =
  "bg-accent hover:bg-accent-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [addingToLists, setAddingToLists] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Contact | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/contacts");
    setContacts(await res.json());
  }, []);

  const loadLists = useCallback(async () => {
    const res = await fetch("/api/lists");
    setLists(await res.json());
  }, []);

  useEffect(() => {
    load();
    loadLists();
  }, [load, loadLists]);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json();
    setName("");
    setPhone("");
    setLoading(false);
    load();
    if (lists.length > 0) {
      setPendingContactId(data.id);
      setSelectedListIds(new Set());
      setModalSearch("");
      setShowListModal(true);
    }
  }

  async function deleteContact() {
    if (!confirmDelete) return;
    await fetch(`/api/contacts/${confirmDelete.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    load();
  }

  function toggleList(listId: string) {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      next.has(listId) ? next.delete(listId) : next.add(listId);
      return next;
    });
  }

  async function confirmAddToLists() {
    if (!pendingContactId) return;
    setAddingToLists(true);
    await Promise.all(
      [...selectedListIds].map((listId) =>
        fetch(`/api/lists/${listId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: pendingContactId }),
        })
      )
    );
    setAddingToLists(false);
    setShowListModal(false);
    setPendingContactId(null);
  }

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditPhone(c.phone);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    await fetch(`/api/contacts/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, phone: editPhone }),
    });
    setSaving(false);
    setEditingId(null);
    load();
  }

  async function importVcf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/contacts/import", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setImportError(data.error ?? "Error al importar");
    } else {
      setImportResult(data);
      load();
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const query = search.trim().toLowerCase();
  const filtered = query
    ? contacts.filter((c) => c.name.toLowerCase().includes(query) || c.phone.includes(query))
    : contacts;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Contactos</h1>
        <p className="text-sm text-gray-500 mt-1">{contacts.length} contactos guardados</p>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Importar desde archivo .vcf</p>
        <div className="flex gap-3 items-center flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".vcf,text/vcard"
            onChange={importVcf}
            disabled={importing}
            className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-muted file:text-accent hover:file:bg-green-100 disabled:opacity-50 cursor-pointer"
          />
          {importing && <span className="text-sm text-gray-400">Importando…</span>}
        </div>
        {importResult && (
          <p className="text-sm text-accent mt-2">
            {importResult.imported} de {importResult.total} contactos importados correctamente.
          </p>
        )}
        {importError && <p className="text-sm text-red-500 mt-2">{importError}</p>}
      </div>

      {/* Add form */}
      <form onSubmit={addContact} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Agregar contacto</p>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
              placeholder="Jane Doe"
            />
          </div>
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Teléfono (E.164)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={`${inputCls} font-mono`}
              placeholder="+5491155556666"
            />
          </div>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </form>

      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className={`${inputCls} w-full pl-9`}
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {query ? "Ningún contacto coincide con la búsqueda." : "Todavía no hay contactos. Agregá uno arriba."}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((c) =>
              editingId === c.id ? (
                <form
                  key={c.id}
                  onSubmit={saveEdit}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-50/80"
                >
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    autoFocus
                    className={`${inputCls} flex-1 min-w-24`}
                    placeholder="Nombre"
                  />
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                    className={`${inputCls} flex-1 min-w-32 font-mono`}
                    placeholder="+5491155556666"
                  />
                  <button type="submit" disabled={saving} className={btnPrimary}>
                    {saving ? "…" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium px-2"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <div key={c.id} className="flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/50 transition-colors duration-100">
                  <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0 text-accent font-semibold text-xs">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{c.name}</div>
                    <div className="text-gray-400 text-xs font-mono mt-0.5">{c.phone}</div>
                  </div>
                  <button
                    onClick={() => startEdit(c)}
                    className="text-xs text-gray-300 hover:text-accent transition-colors font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(c)}
                    className="text-xs text-gray-300 hover:text-red-500 transition-colors font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Eliminar contacto</h2>
            <p className="text-sm text-gray-500 mb-5">
              ¿Seguro que querés eliminar a <strong className="text-gray-800">{confirmDelete.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={deleteContact}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showListModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={(e) => e.target === e.currentTarget && setShowListModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Agregar a listas</h2>
                <button
                  onClick={() => setShowListModal(false)}
                  className="text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <input
                type="search"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Buscar lista…"
                autoFocus
                className={`${inputCls} w-full`}
              />
            </div>

            <div className="overflow-y-auto flex-1 py-1">
              {lists
                .filter((l) => l.name.toLowerCase().includes(modalSearch.trim().toLowerCase()))
                .map((l) => (
                  <label
                    key={l.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedListIds.has(l.id)}
                      onChange={() => toggleList(l.id)}
                      className="accent-accent w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-800">{l.name}</span>
                  </label>
                ))}
              {lists.filter((l) => l.name.toLowerCase().includes(modalSearch.trim().toLowerCase())).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Sin resultados</p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowListModal(false)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Omitir
              </button>
              <button
                onClick={confirmAddToLists}
                disabled={selectedListIds.size === 0 || addingToLists}
                className={`${btnPrimary} min-w-32`}
              >
                {addingToLists
                  ? "Guardando…"
                  : selectedListIds.size === 0
                  ? "Seleccioná una lista"
                  : `Agregar a ${selectedListIds.size} lista${selectedListIds.size > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
