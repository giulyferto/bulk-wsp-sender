"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";

type DeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "SKIPPED" | "CANCELLED";

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
  status: string;
  list: { name: string };
  deliveries: Delivery[];
}

const statusConfig: Record<DeliveryStatus, { label: string; cls: string; dot: string }> = {
  PENDING:   { label: "Pendiente",  cls: "bg-gray-100 text-gray-500",    dot: "bg-gray-400" },
  SENT:      { label: "Enviado",    cls: "bg-blue-50 text-blue-600",     dot: "bg-blue-500" },
  DELIVERED: { label: "Entregado",  cls: "bg-amber-50 text-amber-600",   dot: "bg-amber-500" },
  READ:      { label: "Leído",      cls: "bg-accent-muted text-accent",  dot: "bg-accent" },
  FAILED:    { label: "Fallido",    cls: "bg-red-50 text-red-500",       dot: "bg-red-500" },
  SKIPPED:   { label: "Salteado",   cls: "bg-gray-100 text-gray-400",    dot: "bg-gray-300" },
  CANCELLED: { label: "Cancelado",  cls: "bg-gray-100 text-gray-400",    dot: "bg-gray-300" },
};

const STATUS_ORDER: DeliveryStatus[] = ["READ", "DELIVERED", "SENT", "PENDING", "SKIPPED", "CANCELLED", "FAILED"];

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

  if (!campaign) {
    return <div className="text-sm text-gray-400 pt-8 text-center">Cargando campaña…</div>;
  }

  const total = campaign.deliveries.length;
  const counts = campaign.deliveries.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {} as Record<DeliveryStatus, number>);

  const effectiveTotal = total - (counts.SKIPPED ?? 0) - (counts.CANCELLED ?? 0);
  const readCount = counts.READ ?? 0;
  const deliveredCount = counts.DELIVERED ?? 0;
  const sentCount = counts.SENT ?? 0;
  const failedCount = counts.FAILED ?? 0;
  const readPct = effectiveTotal > 0 ? Math.round((readCount / effectiveTotal) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Resultados de campaña</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lista <strong className="text-gray-700">{campaign.list.name}</strong> &middot;{" "}
          {new Date(campaign.sentAt).toLocaleString("es-AR")}
        </p>
      </div>

      <div className="flex gap-8 items-start">
        {/* Left: KPIs + breakdown + delivery list */}
        <div className="flex-1 min-w-0">
          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-3xl font-bold text-accent tabular-nums">{readPct}%</p>
              <p className="text-xs text-gray-400 mt-1.5 uppercase tracking-wider">Leídos</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-3xl font-bold text-amber-500 tabular-nums">{deliveredCount}</p>
              <p className="text-xs text-gray-400 mt-1.5 uppercase tracking-wider">Entregados</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-3xl font-bold text-blue-500 tabular-nums">{sentCount}</p>
              <p className="text-xs text-gray-400 mt-1.5 uppercase tracking-wider">Enviados</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className={`text-3xl font-bold tabular-nums ${failedCount > 0 ? "text-red-400" : "text-gray-300"}`}>
                {failedCount}
              </p>
              <p className="text-xs text-gray-400 mt-1.5 uppercase tracking-wider">Fallidos</p>
            </div>
          </div>

          {/* Progress bar + status badges */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>{total} destinatarios</span>
              <span className="font-medium text-accent tabular-nums">{readPct}% leído</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{
                  width: `${readPct}%`,
                  boxShadow: readPct > 0 ? "0 0 8px rgba(34,194,129,0.4)" : "none",
                }}
              />
            </div>
            <div className="flex gap-2 flex-wrap mt-3">
              {STATUS_ORDER.map((s) =>
                counts[s] ? (
                  <span
                    key={s}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig[s].cls}`}
                  >
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
                <div
                  key={d.id}
                  className="flex items-center px-5 py-3.5 gap-4 hover:bg-gray-50/50 transition-colors duration-100"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0 text-accent font-semibold text-xs">
                    {d.contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{d.contact.name}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{d.contact.phone}</div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[d.status]?.cls ?? statusConfig.PENDING.cls}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[d.status]?.dot ?? statusConfig.PENDING.dot}`} />
                    {statusConfig[d.status]?.label ?? d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-300 mt-4 text-center">Actualización automática cada 5 s</p>
        </div>

        {/* Right: phone preview — sticky as you scroll the delivery list */}
        <div className="hidden lg:block flex-shrink-0 sticky top-8">
          <WhatsAppPreview body={campaign.body} label="Mensaje enviado" />
        </div>
      </div>
    </div>
  );
}
