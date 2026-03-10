"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successful = params.get("successful") === "true";
    const returnTo = params.get("returnTo") || "/";

    if (!successful) {
      console.error("Login failed:", params.get("error"));
    }

    router.replace(returnTo);
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <p>Signing in...</p>
    </div>
  );
}
