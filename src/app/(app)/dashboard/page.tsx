import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const uid = session!.user.id;

  const [contactsSnap, listsSnap, campaignsSnap] = await Promise.all([
    db.collection(`users/${uid}/contacts`).count().get(),
    db.collection(`users/${uid}/lists`).count().get(),
    db.collection(`users/${uid}/campaigns`).count().get(),
  ]);

  const contactCount = contactsSnap.data().count;
  const listCount = listsSnap.data().count;
  const campaignCount = campaignsSnap.data().count;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Contacts", count: contactCount, href: "/contacts" },
          { label: "Lists", count: listCount, href: "/lists" },
          { label: "Campaigns sent", count: campaignCount, href: "/send" },
        ].map(({ label, count, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-lg border p-6 hover:border-green-500 transition-colors"
          >
            <div className="text-3xl font-bold text-green-600">{count}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </Link>
        ))}
      </div>
      <div className="flex gap-4">
        <Link
          href="/whatsapp"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
        >
          Connect WhatsApp
        </Link>
        <Link
          href="/send"
          className="border border-green-600 text-green-600 px-4 py-2 rounded hover:bg-green-50 text-sm"
        >
          Send a campaign
        </Link>
      </div>
    </div>
  );
}
