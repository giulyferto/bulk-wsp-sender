"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

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
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150";

const btnPrimary =
  "bg-accent hover:bg-accent-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

export default function ListDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [list, setList] = useState<ListDetail | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selectedContact, setSelectedContact] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/lists/${id}`);
    if (res.ok) setList(await res.json());
  }, [id]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setLoadingContacts(true);
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        setAllContacts(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoadingContacts(false));
  }, []);

  const memberIds = new Set(list?.members.map((m) => m.contact.id) ?? []);
  const available = allContacts.filter((c) => !memberIds.has(c.id));

  async function addMember() {
    if (!selectedContact) return;
    setAdding(true);
    setError("");
    const res = await fetch(`/api/lists/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: selectedContact }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al agregar el contacto");
    } else {
      setSelectedContact("");
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
      <div className="text-sm text-gray-400 pt-8 text-center">Cargando lista…</div>
    );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{list.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{list.members.length} contactos en esta lista</p>
      </div>

      {/* Add member */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Agregar contacto</p>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-52">
            {loadingContacts ? (
              <div className="text-sm text-gray-400 py-2">Cargando contactos…</div>
            ) : (
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className={`${inputCls} w-full`}
              >
                <option value="">
                  {available.length === 0
                    ? allContacts.length === 0
                      ? "— sin contactos creados —"
                      : "— todos los contactos ya están en la lista —"
                    : "Seleccioná un contacto…"}
                </option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={addMember}
            disabled={!selectedContact || adding}
            className={btnPrimary}
          >
            {adding ? "Agregando…" : "Agregar"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {list.members.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Esta lista no tiene contactos todavía.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {list.members.map(({ contact }) => (
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
    </div>
  );
}
