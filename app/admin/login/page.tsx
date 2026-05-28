"use client";

import { useState, FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Monogram from "@/components/ui/Monogram";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setErr(res.error || "Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      setErr("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 420,
          border: "0.5px solid var(--kb-gold)",
          padding: 44,
          background: "var(--kb-black)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <Monogram />
        </div>
        <span className="kb-eyebrow" style={{ display: "block", textAlign: "center", marginBottom: 14 }}>
          Admin Console
        </span>
        <h2 style={{ fontFamily: "var(--kb-serif)", fontSize: 28, textAlign: "center", marginBottom: 32, fontWeight: 400 }}>
          Welcome <em style={{ fontStyle: "italic", color: "var(--kb-gold-light)" }}>back</em>.
        </h2>
        <div style={{ display: "grid", gap: 18 }}>
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@khanbhais.in"
            required
            disabled={loading}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          {err && <p style={{ color: "#ff6b6b", fontSize: 12, fontFamily: "var(--kb-mono)" }}>{err}</p>}
          <Button type="submit" variant="primary" showArrow disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
