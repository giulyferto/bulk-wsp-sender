import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { NavLink } from "@/components/NavLink";

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" />
      <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M5.5 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-3 5.5c0-1.66 1.34-3 3-3s3 1.34 3 3H2.5zm6.5-3c.9 0 2.25.6 2.25 2.25V13h-1.5v-.25C9.75 11.6 8.67 11 7.5 11c.41-.47 1.1-.75 1.5-.75.83 0 1.5.17 1.5 1.25v.75h-1.5V12zM10 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <rect x="1" y="3" width="2" height="2" rx="0.5" />
      <rect x="5" y="3.5" width="9" height="1" rx="0.5" />
      <rect x="1" y="7" width="2" height="2" rx="0.5" />
      <rect x="5" y="7.5" width="9" height="1" rx="0.5" />
      <rect x="1" y="11" width="2" height="2" rx="0.5" />
      <rect x="5" y="11.5" width="9" height="1" rx="0.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 1C4.14 1 1 4.14 1 8c0 1.24.32 2.4.88 3.4L1 15l3.73-.86A6.96 6.96 0 0 0 8 15c3.86 0 7-3.14 7-7S11.86 1 8 1zm2.86 9.5c-.14.38-.82.72-1.13.77-.28.04-.62.05-1-.07-.23-.08-.53-.18-.91-.36-1.66-.71-2.74-2.39-2.82-2.5-.08-.11-.64-.85-.64-1.62s.42-1.2.57-1.37c.14-.16.31-.2.41-.2h.31l.3.01c.1 0 .24-.04.37.28.14.33.47 1.14.51 1.22.04.08.07.18.01.29-.05.11-.08.18-.15.27-.08.1-.17.21-.24.28-.07.08-.15.16-.06.31.09.15.38.63.82 1.02.57.5 1.04.65 1.19.73.15.07.23.06.31-.03.09-.09.37-.43.47-.58.1-.14.2-.12.33-.07.13.05.86.4 1.01.48.15.07.25.11.28.17.03.06.03.38-.1.76z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M2 1.5l13 6.5-13 6.5V10l9-2-9-2V1.5z" />
    </svg>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-sidebar flex-shrink-0 flex flex-col sticky top-0 h-screen overflow-y-auto">
        {/* Brand */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1C3.68 1 1 3.68 1 7c0 1.05.27 2.03.75 2.88L1 13l3.22-.73A5.97 5.97 0 0 0 7 13c3.32 0 6-2.68 6-6S10.32 1 7 1zm2.47 8.13c-.13.34-.77.66-1.06.7-.26.04-.58.05-.93-.06-.21-.07-.49-.16-.84-.31-1.48-.64-2.45-2.14-2.52-2.24-.07-.1-.59-.78-.59-1.5 0-.71.38-1.07.51-1.21.13-.15.28-.18.38-.18h.27l.28.01c.1 0 .22-.04.34.25.12.3.42 1.03.46 1.1.04.08.06.17.01.27-.05.1-.07.16-.14.25-.07.08-.15.19-.21.25-.07.07-.14.15-.06.28.08.14.35.58.75.94.52.46.95.6 1.09.67.14.07.22.06.29-.03.08-.09.34-.39.43-.53.09-.13.18-.11.3-.06.12.05.79.37.93.44.14.07.23.1.26.15.03.06.03.35-.09.7z"
                  fill="white"
                />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">WSP Sender</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 pt-2">
          <NavLink href="/dashboard" icon={<GridIcon />}>
            Panel
          </NavLink>
          <NavLink href="/contacts" icon={<UsersIcon />}>
            Contactos
          </NavLink>
          <NavLink href="/lists" icon={<ListIcon />}>
            Listas
          </NavLink>
          <NavLink href="/whatsapp" icon={<PhoneIcon />}>
            WhatsApp
          </NavLink>
          <NavLink href="/send" icon={<SendIcon />} matchPrefixes={["/send", "/campaigns"]}>
            Enviar
          </NavLink>
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-gray-500 truncate mb-2" title={session.user.email ?? ""}>
            {session.user.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 bg-page overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
