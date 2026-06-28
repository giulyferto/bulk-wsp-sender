"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ContactList {
  id: string;
  name: string;
  _count: { members: number };
}

export default function ListsPage() {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/lists");
    setLists(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

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
      <h1 className="text-2xl font-bold mb-6">Lists</h1>
      <form onSubmit={createList} className="bg-white border rounded-lg p-4 mb-6 flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">List name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border rounded px-3 py-2 text-sm"
            placeholder="My list"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          Create list
        </button>
      </form>

      <div className="bg-white border rounded-lg divide-y">
        {lists.length === 0 && (
          <p className="p-4 text-sm text-gray-500">No lists yet.</p>
        )}
        {lists.map((l) => (
          <div key={l.id} className="flex items-center px-4 py-3 gap-4">
            <div className="flex-1">
              <Link href={`/lists/${l.id}`} className="font-medium text-sm hover:text-green-600">
                {l.name}
              </Link>
              <div className="text-gray-500 text-sm">{l._count.members} contacts</div>
            </div>
            <button
              onClick={() => deleteList(l.id)}
              className="text-red-500 text-sm hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
