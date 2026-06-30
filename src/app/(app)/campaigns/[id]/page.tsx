"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";

interface Delivery {
  id: string;
  status: string;
  contact: { name: string; phone: string };
}

interface Campaign {
  id: string;
  body: string;
  imageUrls?: string[];
  sentAt: string;
  status?: string;
  list: { name: string };
  deliveries: Delivery[];
}

const WA_BLUE = "#34b7f1";
const WA_GREY = "#8696a0";

function isDelivered(status: string) {
  return status === "SENT" || status === "DELIVERED" || status === "READ";
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

function Ticks({ double, color }: { double?: boolean; color: string }) {
  return (
    <svg viewBox="0 0 16 11" width="15" height="10" fill="none" aria-hidden="true">
      {double && <path d="M0.5 5.6L3.6 8.8L9.3 1.3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
      <path d="M3.7 5.6L6.8 8.8L15.5 1.3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FailedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5v4M8 11h.01" />
    </svg>
  );
}

function receiptFor(status: string) {
  switch (status) {
    case "READ":
      return { icon: <Ticks double color={WA_BLUE} />, label: "Leído", tone: "text-gray-400" };
    case "DELIVERED":
      return { icon: <Ticks double color={WA_GREY} />, label: "Entregado", tone: "text-gray-400" };
    case "SENT":
      return { icon: <Ticks color={WA_GREY} />, label: "Enviado", tone: "text-gray-400" };
    case "FAILED":
      return { icon: <FailedIcon />, label: "No enviado", tone: "text-red-500" };
    default:
      return { icon: null, label: "Sin enviar", tone: "text-gray-300" };
  }
}

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch(`/api/campaigns/${id}/deliveries`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { setCampaign(data); setLoadState("ready"); })
      .catch(() => setLoadState("error"));
  }, [id]);

  if (loadState === "loading") {
    return <div className="text-sm text-gray-400 pt-8 text-center">Cargando campaña…</div>;
  }

  if (loadState === "error" || !campaign) {
    return (
      <div className="text-center pt-12">
        <p className="text-sm text-gray-400 mb-3">No pudimos encontrar esta campaña.</p>
        <Link href="/campaigns" className="text-sm text-accent hover:underline">
          Volver a campañas
        </Link>
      </div>
    );
  }

  const total = campaign.deliveries.length;
  const success = campaign.deliveries.filter((d) => isDelivered(d.status));
  const notSent = campaign.deliveries.filter((d) => !isDelivered(d.status) && d.status !== "FAILED");
  const failed = campaign.deliveries.filter((d) => d.status === "FAILED");
  const retryCount = failed.length + notSent.length;

  const sortedDeliveries = [...campaign.deliveries].sort((a, b) => {
    const rank = (s: string) => (s === "FAILED" ? 0 : isDelivered(s) ? 2 : 1);
    const ra = rank(a.status);
    const rb = rank(b.status);
    return ra !== rb ? ra - rb : a.contact.name.localeCompare(b.contact.name);
  });

  return (
    <div>
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-accent transition-colors duration-150 mb-3"
      >
        <ChevronLeft />
        Campañas
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Resultados de campaña</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lista <strong className="text-gray-700">{campaign.list.name}</strong> &middot;{" "}
            {new Date(campaign.sentAt).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-shrink-0">
          {campaign.status === "cancelled" && (
            <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-400">
              Cancelada
            </span>
          )}
          {campaign.status === "incomplete" && (
            <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-600">
              Incompleta
            </span>
          )}
          {retryCount > 0 && (
            <button
              onClick={() => router.push(`/campaigns/${id}/retry`)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              Reintentar ({retryCount})
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-8 items-start">
        <div className="flex-1 min-w-0">
          {/* Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5 mb-4 grid grid-cols-4 divide-x divide-gray-100">
            <div className="pr-8">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Destinatarios</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums mt-1">{total}</p>
            </div>
            <div className="px-8">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Enviados</p>
              <p className="text-3xl font-bold text-accent tabular-nums mt-1">{success.length}</p>
            </div>
            <div className="px-8">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Sin enviar</p>
              <p className={`text-3xl font-bold tabular-nums mt-1 ${notSent.length > 0 ? "text-gray-500" : "text-gray-300"}`}>
                {notSent.length}
              </p>
            </div>
            <div className="pl-8">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">Fallidos</p>
              <p className={`text-3xl font-bold tabular-nums mt-1 ${failed.length > 0 ? "text-red-400" : "text-gray-300"}`}>
                {failed.length}
              </p>
            </div>
          </div>

          {/* Delivery list */}
          {sortedDeliveries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-sm text-gray-400">No hay destinatarios registrados para esta campaña</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {sortedDeliveries.map((d) => {
                  const receipt = receiptFor(d.status);
                  return (
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
                      <div className={`flex items-center gap-1.5 flex-shrink-0 text-xs font-medium ${receipt.tone}`}>
                        {receipt.icon}
                        {receipt.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: phone preview */}
        <div className="hidden lg:block flex-shrink-0 sticky top-8">
          <WhatsAppPreview body={campaign.body} imageUrls={campaign.imageUrls} label="Mensaje enviado" />
        </div>
      </div>
    </div>
  );
}
