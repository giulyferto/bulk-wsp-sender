"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const LIST_CAPACITY = 150;

interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface ListDetail {
  id: string;
  name: string;
  members: { contact: Contact }[];
}

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150";

export default function ListDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [list, setList] = useState<ListDetail | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/lists/${id}`);
    if (res.ok) setList(await res.json());
  }, [id]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    setLoadingContacts(true);
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setAllContacts(Array.isArray(data) ? data : []))
      .finally(() => setLoadingContacts(false));
  }, []);

  const memberIds = useMemo(
    () => new Set(list?.members.map((m) => m.contact.id) ?? []),
    [list]
  );

  const available = useMemo(
    () => allContacts.filter((c) => !memberIds.has(c.id)),
    [allContacts, memberIds]
  );

  const memberCount = list?.members.length ?? 0;
  const remainingSlots = LIST_CAPACITY - memberCount;
  const atCapacity = memberCount >= LIST_CAPACITY;
  const capacityPct = Math.min((memberCount / LIST_CAPACITY) * 100, 100);

  const pickerFiltered = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return q
      ? available.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      : available;
  }, [available, pickerSearch]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return q
      ? (list?.members ?? []).filter(
          ({ contact: c }) =>
            c.name.toLowerCase().includes(q) || c.phone.includes(q)
        )
      : (list?.members ?? []);
  }, [list, memberSearch]);

  function startEditName() {
    setNameValue(list?.name ?? "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 40);
  }

  async function saveEditName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === list?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    const res = await fetch(`/api/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      await loadList();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar el nombre");
    }
    setSavingName(false);
    setEditingName(false);
  }

  function openPicker() {
    setPickerSearch("");
    setSelected(new Set());
    setError("");
    setShowPicker(true);
    setTimeout(() => pickerSearchRef.current?.focus(), 60);
  }

  function toggleContact(contactId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else if (next.size < remainingSlots) {
        next.add(contactId);
      }
      return next;
    });
  }

  function selectAll() {
    const toSelect = pickerFiltered.slice(0, remainingSlots);
    setSelected(new Set(toSelect.map((c) => c.id)));
  }

  async function addSelected() {
    if (selected.size === 0) return;
    setAdding(true);
    setError("");
    const res = await fetch(`/api/lists/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: [...selected] }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al agregar contactos");
    } else {
      setShowPicker(false);
      await loadList();
    }
    setAdding(false);
  }

  async function removeMember(contactId: string) {
    setError("");
    const res = await fetch(`/api/lists/${id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al eliminar el contacto");
    } else {
      await loadList();
    }
  }

  if (!list)
    return (
      <div className="flex items-center justify-center pt-16 text-sm text-gray-400">
        Cargando lista…
      </div>
    );

  return (
    <div>
      {/* Back nav */}
      <Link
        href="/lists"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-5 group"
      >
        <span className="w-7 h-7 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center group-hover:border-gray-300 transition-colors">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="12"
            height="12"
          >
            <path d="M10 12L6 8l4-4" />
          </svg>
        </span>
        Listas
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
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
              <button
                onClick={saveEditName}
                disabled={savingName}
                className="text-xs font-medium text-accent hover:text-accent-dark disabled:opacity-50 transition-colors flex-shrink-0"
              >
                {savingName ? "Guardando…" : "Guardar"}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{list.name}</h1>
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
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-sm text-gray-500">
              {memberCount} / {LIST_CAPACITY} contactos
            </span>
            {atCapacity && (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Límite alcanzado
              </span>
            )}
          </div>
          <div className="mt-2 w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${atCapacity ? "bg-amber-400" : "bg-accent"}`}
              style={{ width: `${capacityPct}%` }}
            />
          </div>
        </div>

        <button
          onClick={openPicker}
          disabled={atCapacity || loadingContacts}
          className="flex-shrink-0 bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 inline-flex items-center gap-1.5"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            width="13"
            height="13"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Agregar contactos
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Members list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {memberCount > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Filtrar miembros…"
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
              />
            </div>
          </div>
        )}

        {filteredMembers.length === 0 ? (
          <div className="py-12 text-center">
            <svg
              className="w-10 h-10 mx-auto text-gray-200 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-400">
              {memberSearch
                ? "Ningún miembro coincide con la búsqueda."
                : "Esta lista no tiene contactos todavía. Usá el botón de arriba para agregar."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredMembers.map(({ contact }) => (
              <div
                key={contact.id}
                className="flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/50 transition-colors duration-100"
              >
                <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0 text-accent font-semibold text-xs">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">{contact.name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{contact.phone}</div>
                </div>
                <button
                  onClick={() => removeMember(contact.id)}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors font-medium"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact picker modal */}
      {showPicker && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:px-4"
          onClick={(e) => e.target === e.currentTarget && setShowPicker(false)}
        >
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[82vh]">
            {/* Modal header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Agregar contactos</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {remainingSlots > 0
                      ? `${remainingSlots} lugar${remainingSlots !== 1 ? "es" : ""} disponible${remainingSlots !== 1 ? "s" : ""}`
                      : "Lista completa"}
                  </p>
                </div>
                <button
                  onClick={() => setShowPicker(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors mt-0.5"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="10" height="10">
                    <path d="M12 4L4 12M4 4l8 8" />
                  </svg>
                </button>
              </div>
              <div className="relative">
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
                  ref={pickerSearchRef}
                  type="search"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Buscar por nombre o teléfono…"
                  className={`${inputCls} w-full pl-9`}
                />
              </div>
            </div>

            {/* Select-all toolbar */}
            {!loadingContacts && pickerFiltered.length > 0 && (
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-gray-50/60">
                <span className="text-xs text-gray-500">
                  {pickerFiltered.length} disponible{pickerFiltered.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-3">
                  {selected.size > 0 && (
                    <button
                      onClick={() => setSelected(new Set())}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                  <button
                    onClick={selectAll}
                    disabled={remainingSlots === 0}
                    className="text-xs font-medium text-accent hover:text-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Seleccionar todos ({Math.min(pickerFiltered.length, remainingSlots)})
                  </button>
                </div>
              </div>
            )}

            {/* Contact rows */}
            <div className="overflow-y-auto flex-1">
              {loadingContacts ? (
                <div className="py-8 text-center text-sm text-gray-400">Cargando contactos…</div>
              ) : pickerFiltered.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  {pickerSearch
                    ? "Sin resultados para esa búsqueda."
                    : available.length === 0
                    ? "Todos los contactos ya están en la lista."
                    : ""}
                </div>
              ) : (
                pickerFiltered.map((c) => {
                  const isSelected = selected.has(c.id);
                  const isDisabled = !isSelected && selected.size >= remainingSlots;
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                        isDisabled
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer hover:bg-gray-50"
                      } ${isSelected ? "bg-accent-muted/50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => toggleContact(c.id)}
                        className="accent-accent w-4 h-4 rounded flex-shrink-0"
                      />
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500 font-semibold text-xs">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 font-medium truncate">{c.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{c.phone}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400">
                {selected.size > 0
                  ? `${selected.size} seleccionado${selected.size !== 1 ? "s" : ""}`
                  : "Ninguno seleccionado"}
              </span>
              <button
                onClick={addSelected}
                disabled={selected.size === 0 || adding}
                className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
              >
                {adding
                  ? "Agregando…"
                  : selected.size === 0
                  ? "Seleccioná contactos"
                  : `Agregar ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
