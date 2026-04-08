"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toAuthError } from "@/types/auth";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(toAuthError(error).message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Flow<span className="text-primary">Trace</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your account
        </p>
      </div>

      <div className="glass-card-strong rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            disabled={loading}
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            disabled={loading}
            required
          />

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-negative/40 px-3 py-2 text-sm text-negative"
              style={{ background: "var(--negative-soft)" }}
            >
              {errorMsg}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Link
              href="#"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
            <Link
              href="/signup"
              className="font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Create account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
