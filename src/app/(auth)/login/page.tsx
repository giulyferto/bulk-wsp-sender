"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { clientAuth, googleProvider } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(clientAuth, googleProvider);
      const idToken = await result.user.getIdToken();
      const res = await signIn("google-firebase", { idToken, redirect: false });
      if (res?.ok) {
        router.push("/dashboard");
      } else {
        setError("No se pudo iniciar sesión con Google");
        setLoading(false);
      }
    } catch {
      setError("No se pudo iniciar sesión con Google");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar px-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1C3.68 1 1 3.68 1 7c0 1.05.27 2.03.75 2.88L1 13l3.22-.73A5.97 5.97 0 0 0 7 13c3.32 0 6-2.68 6-6S10.32 1 7 1zm2.47 8.13c-.13.34-.77.66-1.06.7-.26.04-.58.05-.93-.06-.21-.07-.49-.16-.84-.31-1.48-.64-2.45-2.14-2.52-2.24-.07-.1-.59-.78-.59-1.5 0-.71.38-1.07.51-1.21.13-.15.28-.18.38-.18h.27l.28.01c.1 0 .22-.04.34.25.12.3.42 1.03.46 1.1.04.08.06.17.01.27-.05.1-.07.16-.14.25-.07.08-.15.19-.21.25-.07.07-.14.15-.06.28.08.14.35.58.75.94.52.46.95.6 1.09.67.14.07.22.06.29-.03.08-.09.34-.39.43-.53.09-.13.18-.11.3-.06.12.05.79.37.93.44.14.07.23.1.26.15.03.06.03.35-.09.7z"
                fill="white"
              />
            </svg>
          </div>
          <span className="text-white font-semibold text-base">WSP Sender</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-7 shadow-2xl">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Iniciar sesión</h1>
          <p className="text-sm text-gray-400 mb-6">Usá tu cuenta de Google para continuar</p>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
              <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
              <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
              <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
            </svg>
            {loading ? "Ingresando…" : "Continuar con Google"}
          </button>
        </div>
      </div>
    </div>
  );
}
