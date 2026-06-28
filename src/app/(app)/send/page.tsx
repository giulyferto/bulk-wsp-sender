"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ContactList {
  id: string;
  name: string;
  _count: { members: number };
}

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

  useEffect(() => { loadLists(); }, [loadLists]);

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
      setError(data.error ?? "Failed to send");
      setLoading(false);
      return;
    }
    const { campaignId } = await res.json();
    router.push(`/campaigns/${campaignId}`);
  }

  const selectedList = lists.find((l) => l.id === listId);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Send Campaign</h1>
      <div className="bg-white border rounded-lg p-6 max-w-lg">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select list</label>
            <select
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Choose a list...</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l._count.members} contacts)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="w-full border rounded px-3 py-2 text-sm resize-none"
              placeholder="Type your message here..."
            />
          </div>

          {selectedList && (
            <p className="text-sm text-gray-500">
              This message will be sent to {selectedList._count.members} contacts with 1 second between each send.
            </p>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send campaign"}
          </button>
        </form>
      </div>
    </div>
  );
}
