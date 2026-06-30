"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  matchPrefixes?: string[];
}

export function NavLink({ href, children, icon, matchPrefixes }: NavLinkProps) {
  const pathname = usePathname();
  const prefixes = matchPrefixes ?? [href];
  const active = prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
        active
          ? "bg-accent/15 text-accent"
          : "text-gray-400 hover:text-white hover:bg-white/10"
      }`}
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      {children}
    </Link>
  );
}
