"use client";
import { useState, useEffect, useCallback, useRef } from "react";

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
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setImportError(data.error ?? "Import failed");
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
      <h1 className="text-2xl font-bold mb-6">Contacts</h1>
      <div className="bg-white border rounded-lg p-4 mb-6 flex flex-col gap-2">
        <span className="text-sm font-medium">Import from .vcf file</span>
        <div className="flex gap-3 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".vcf,text/vcard"
            onChange={importVcf}
            disabled={importing}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50"
          />
          {importing && <span className="text-sm text-gray-500">Importing…</span>}
        </div>
        {importResult && (
          <p className="text-sm text-green-700">
            Imported {importResult.imported} of {importResult.total} contacts.
          </p>
        )}
        {importError && <p className="text-sm text-red-600">{importError}</p>}
      </div>

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

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or phone…"
        className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
      />

      <div className="bg-white border rounded-lg divide-y">
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-gray-500">
            {query ? "No contacts match your search." : "No contacts yet."}
          </p>
        )}
        {filtered.map((c) => (
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
