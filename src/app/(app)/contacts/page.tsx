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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/contacts");
    setContacts(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/50 transition-colors duration-100">
                <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0 text-accent font-semibold text-xs">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">{c.name}</div>
                  <div className="text-gray-400 text-xs font-mono mt-0.5">{c.phone}</div>
                </div>
                <button
                  onClick={() => deleteContact(c.id)}
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
