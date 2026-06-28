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

  if (!list) return <p className="text-sm text-gray-500">Cargando lista...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">{list.name}</h1>

      <div className="bg-white border rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Agregar contacto a la lista</p>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            {loadingContacts ? (
              <p className="text-sm text-gray-400">Cargando contactos...</p>
            ) : (
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="border rounded px-3 py-2 text-sm text-gray-900 min-w-[220px]"
              >
                <option value="">
                  {available.length === 0
                    ? allContacts.length === 0
                      ? "— sin contactos creados —"
                      : "— todos los contactos ya están en la lista —"
                    : "Seleccioná un contacto..."}
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
            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {adding ? "Agregando..." : "Agregar"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      <div className="bg-white border rounded-lg divide-y">
        {list.members.length === 0 && (
          <p className="p-4 text-sm text-gray-500">Esta lista no tiene contactos todavía.</p>
        )}
        {list.members.map(({ contact }) => (
          <div key={contact.id} className="flex items-center px-4 py-3 gap-4">
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">{contact.name}</div>
              <div className="text-gray-500 text-sm">{contact.phone}</div>
            </div>
            <button
              onClick={() => removeMember(contact.id)}
              className="text-red-500 text-sm hover:underline"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
