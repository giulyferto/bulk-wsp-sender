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

const statusBadge: Record<DeliveryStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-yellow-100 text-yellow-700",
  READ: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
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

  if (!campaign) return <p className="text-sm text-gray-500">Loading...</p>;

  const counts = campaign.deliveries.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<DeliveryStatus, number>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Campaign Results</h1>
      <p className="text-sm text-gray-500 mb-1">
        List: <strong>{campaign.list.name}</strong> &middot; Sent{" "}
        {new Date(campaign.sentAt).toLocaleString()}
      </p>
      <div className="bg-gray-50 border rounded p-3 text-sm text-gray-700 mb-4 whitespace-pre-wrap">
        {campaign.body}
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        {(["SENT", "DELIVERED", "READ", "FAILED", "PENDING"] as DeliveryStatus[]).map(
          (s) =>
            counts[s] ? (
              <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge[s]}`}>
                {s}: {counts[s]}
              </span>
            ) : null
        )}
      </div>

      <div className="bg-white border rounded-lg divide-y">
        {campaign.deliveries.map((d) => (
          <div key={d.id} className="flex items-center px-4 py-3 gap-4">
            <div className="flex-1">
              <div className="text-sm font-medium">{d.contact.name}</div>
              <div className="text-xs text-gray-500">{d.contact.phone}</div>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge[d.status]}`}>
              {d.status}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4">Auto-refreshes every 5 seconds</p>
    </div>
  );
}
