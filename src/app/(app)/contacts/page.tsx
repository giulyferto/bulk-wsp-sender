"use client";
import { useState, useEffect, useCallback } from "react";

interface Contact {
  id: string;
  name: string;
  phone: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/contacts");
    setContacts(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    setName("");
    setPhone("");
    setLoading(false);
    load();
  }

  async function deleteContact(id: string) {
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Contacts</h1>
      <form onSubmit={addContact} className="bg-white border rounded-lg p-4 mb-6 flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border rounded px-3 py-2 text-sm"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone (E.164)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="border rounded px-3 py-2 text-sm"
            placeholder="+5491155556666"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          Add contact
        </button>
      </form>

      <div className="bg-white border rounded-lg divide-y">
        {contacts.length === 0 && (
          <p className="p-4 text-sm text-gray-500">No contacts yet.</p>
        )}
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center px-4 py-3 gap-4">
            <div className="flex-1">
              <div className="font-medium text-sm">{c.name}</div>
              <div className="text-gray-500 text-sm">{c.phone}</div>
            </div>
            <button
              onClick={() => deleteContact(c.id)}
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
