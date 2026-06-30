"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Campaign {
  id: string;
  listName: string;
  body: string;
  sentAt: string;
  status: string;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  done:      { label: "Completada", cls: "bg-accent-muted text-accent" },
  cancelled: { label: "Cancelada",  cls: "bg-gray-100 text-gray-400" },
  sending:   { label: "En curso",   cls: "bg-blue-50 text-blue-600" },
};

function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/campaigns");
    if (res.ok) setCampaigns(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="text-sm text-gray-400 pt-8 text-center">Cargando…</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Campañas</h1>
          <p className="text-sm text-gray-500 mt-1">Historial de difusiones enviadas</p>
        </div>
        <Link
          href="/send"
          className="text-sm bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-accent-dark transition-colors"
        >
          Nueva campaña
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-sm text-gray-400">Todavía no enviaste ninguna campaña</p>
          <Link href="/send" className="mt-3 inline-block text-sm text-accent hover:underline">
            Enviar primera campaña
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {campaigns.map((c) => {
              const badge = statusBadge[c.status] ?? statusBadge.done;
              const date = new Date(c.sentAt);
              return (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  className="flex items-center px-5 py-4 gap-4 hover:bg-gray-50/50 transition-colors duration-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {c.listName || "Lista eliminada"}
                      </span>
                      <span
                        className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {c.body.slice(0, 90)}{c.body.length > 90 ? "…" : ""}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium text-gray-500">
                      {date.toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="text-gray-300 flex-shrink-0">
                    <ChevronRight />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
