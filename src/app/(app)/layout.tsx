import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-green-600 text-lg">WSP Messenger</span>
        <Link href="/dashboard" className="text-sm hover:text-green-600">Dashboard</Link>
        <Link href="/contacts" className="text-sm hover:text-green-600">Contacts</Link>
        <Link href="/lists" className="text-sm hover:text-green-600">Lists</Link>
        <Link href="/whatsapp" className="text-sm hover:text-green-600">WhatsApp</Link>
        <Link href="/send" className="text-sm hover:text-green-600">Send</Link>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-500">{session.user.email}</span>
          <SignOutButton />
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
