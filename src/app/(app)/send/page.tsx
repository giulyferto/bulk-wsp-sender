"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ContactList {
  id: string;
  name: string;
  _count: { members: number };
}

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150 w-full";

export default function SendPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [listId, setListId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLists = useCallback(async () => {
    const res = await fetch("/api/lists");
    setLists(await res.json());
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, message }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al enviar");
      setLoading(false);
      return;
    }
    const { campaignId } = await res.json();
    router.push(`/campaigns/${campaignId}`);
  }

  const selectedList = lists.find((l) => l.id === listId);
  const charCount = message.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Enviar campaña</h1>
        <p className="text-sm text-gray-500 mt-1">
          Los mensajes se envían con 1.5 s de pausa entre cada uno
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
        <form onSubmit={handleSend} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Lista de destinatarios</label>
            <select value={listId} onChange={(e) => setListId(e.target.value)} required className={inputCls}>
              <option value="">Elegir una lista…</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l._count.members} contactos
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-gray-500">Mensaje</label>
              <span className="text-xs text-gray-300 tabular-nums">{charCount} car.</span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              className={`${inputCls} resize-none leading-relaxed`}
              placeholder="Escribí tu mensaje acá…"
            />
          </div>

          {selectedList && (
            <div className="bg-accent-muted rounded-lg px-4 py-3 text-sm text-green-800">
              Se enviará a <strong>{selectedList._count.members} contactos</strong> de la lista &ldquo;{selectedList.name}&rdquo;.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-lg font-medium text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enviando…" : "Enviar campaña"}
          </button>
        </form>
      </div>
    </div>
  );
}
