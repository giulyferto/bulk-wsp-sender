"use client";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-xs text-gray-500 hover:text-red-400 transition-colors font-medium"
    >
      Cerrar sesión
    </button>
  );
}
