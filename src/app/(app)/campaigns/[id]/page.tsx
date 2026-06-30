"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

type DeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

interface Delivery {
  id: string;
  status: DeliveryStatus;
  waMessageId: string | null;
  contact: { name: string; phone: string };
}

interface Campaign {
  id: string;
  body: string;
  sentAt: string;
  list: { name: string };
  deliveries: Delivery[];
}

const statusConfig: Record<DeliveryStatus, { label: string; cls: string; dot: string }> = {
  PENDING:   { label: "Pendiente",  cls: "bg-gray-100 text-gray-500",    dot: "bg-gray-400" },
  SENT:      { label: "Enviado",    cls: "bg-blue-50 text-blue-600",     dot: "bg-blue-500" },
  DELIVERED: { label: "Entregado",  cls: "bg-amber-50 text-amber-600",   dot: "bg-amber-500" },
  READ:      { label: "Leído",      cls: "bg-accent-muted text-accent",  dot: "bg-accent" },
  FAILED:    { label: "Fallido",    cls: "bg-red-50 text-red-500",       dot: "bg-red-500" },
};

export default function CampaignPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}/deliveries`);
    if (res.ok) setCampaign(await res.json());
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  if (!campaign)
    return <div className="text-sm text-gray-400 pt-8 text-center">Cargando campaña…</div>;

  const total = campaign.deliveries.length;
  const counts = campaign.deliveries.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {} as Record<DeliveryStatus, number>);

  const readCount = counts.READ ?? 0;
  const readPct = total > 0 ? Math.round((readCount / total) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Resultados de campaña</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lista <strong className="text-gray-700">{campaign.list.name}</strong> &middot;{" "}
          {new Date(campaign.sentAt).toLocaleString("es-AR")}
        </p>
      </div>

      {/* Message preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Mensaje enviado</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{campaign.body}</p>
      </div>

      {/* Status summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Resumen</p>
          <span className="text-xs text-gray-400">{total} destinatarios</span>
        </div>

        {/* Read progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Leídos</span>
            <span className="font-medium text-accent tabular-nums">{readPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${readPct}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["READ", "DELIVERED", "SENT", "PENDING", "FAILED"] as DeliveryStatus[]).map((s) =>
            counts[s] ? (
              <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig[s].cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[s].dot}`} />
                {statusConfig[s].label}: {counts[s]}
              </span>
            ) : null
          )}
        </div>
      </div>

      {/* Delivery list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {campaign.deliveries.map((d) => (
            <div key={d.id} className="flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/50 transition-colors duration-100">
              <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0 text-accent font-semibold text-xs">
                {d.contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{d.contact.name}</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">{d.contact.phone}</div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[d.status].cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[d.status].dot}`} />
                {statusConfig[d.status].label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-300 mt-4 text-center">Actualización automática cada 5 s</p>
    </div>
  );
}
