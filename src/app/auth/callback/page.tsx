"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      try {
        // Parse access_token from url hash parameters (Supabase redirects with tokens in hash)
        const hash = window.location.hash;
        if (!hash) {
          setError("No authentication parameters found in the URL.");
          return;
        }

        const params = new URLSearchParams(hash.replace("#", "?"));
        const accessToken = params.get("access_token");

        if (!accessToken) {
          setError("Access token missing from URL parameters.");
          return;
        }

        // Exchange Supabase token for our custom session JWT
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to authenticate with Google.");
          return;
        }

        // Save token to localStorage and redirect
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        router.push("/chat");
        router.refresh();
      } catch (err) {
        console.error("Callback handler error:", err);
        setError("A network error occurred while signing in.");
      }
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl animate-fade-in">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Authentication Error</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 w-full rounded-xl bg-zinc-800 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-zinc-400 animate-pulse">Verifying Google account…</p>
      </div>
    </div>
  );
}
