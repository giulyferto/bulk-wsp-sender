"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors duration-150 w-full";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al registrarse");
      setLoading(false);
    } else {
      router.push("/login");
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
          <h1 className="text-lg font-semibold text-gray-900 mb-5">Crear cuenta</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputCls}
                placeholder="vos@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputCls}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-lg font-medium text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>
          <p className="mt-5 text-sm text-center text-gray-400">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-accent hover:underline font-medium">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
