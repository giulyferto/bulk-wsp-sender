"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ContactList {
  id: string;
  name: string;
  _count: { members: number };
}

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150";

const btnPrimary =
  "bg-accent hover:bg-accent-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

export default function ListsPage() {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function deleteList(id: string) {
    await fetch(`/api/lists/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Listas</h1>
        <p className="text-sm text-gray-500 mt-1">Agrupá tus contactos para envíos masivos</p>
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
              <div key={l.id} className="flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/50 transition-colors duration-100">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/lists/${l.id}`}
                    className="font-medium text-sm text-gray-900 hover:text-accent transition-colors"
                  >
                    {l.name}
                  </Link>
                  <div className="text-xs text-gray-400 mt-0.5">{l._count.members} contactos</div>
                </div>
                <Link
                  href={`/lists/${l.id}`}
                  className="text-xs text-gray-400 hover:text-accent transition-colors font-medium"
                >
                  Gestionar →
                </Link>
                <button
                  onClick={() => deleteList(l.id)}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors font-medium"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
