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
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Panel</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen de tu cuenta</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Contactos", count: contactCount, href: "/contacts" },
          { label: "Listas", count: listCount, href: "/lists" },
          { label: "Campañas enviadas", count: campaignCount, href: "/send" },
        ].map(({ label, count, href }) => (
          <Link
            key={label}
            href={href}
            className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
          >
            <div className="text-4xl font-bold text-accent tabular-nums">{count}</div>
            <div className="text-sm text-gray-500 mt-1.5 font-medium">{label}</div>
            <div className="mt-5 flex items-center gap-1 text-xs text-gray-300 group-hover:text-accent transition-colors duration-150">
              Ver todos
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link
          href="/whatsapp"
          className="bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
        >
          Conectar WhatsApp
        </Link>
        <Link
          href="/send"
          className="border border-gray-200 bg-white text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:border-accent hover:text-accent transition-colors duration-150"
        >
          Enviar campaña
        </Link>
      </div>
    </div>
  );
}
