"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toAuthError } from "@/types/auth";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function SignupPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!fullName.trim()) errs.fullName = "Please enter your name.";
    if (!email.trim()) errs.email = "Please enter your email.";
    if (password.length < 8)
      errs.password = "Password must be at least 8 characters.";
    if (confirmPassword !== password)
      errs.confirmPassword = "Passwords do not match.";
    return errs;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setErrorMsg(toAuthError(error).message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Flow<span className="text-primary">Trace</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your account
        </p>
      </div>

      <div className="glass-card-strong rounded-2xl p-8">
        {success ? (
          <div className="flex flex-col gap-4 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-primary"
              style={{ background: "var(--positive-soft)" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Check your email
            </h2>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click the link to activate your account.
            </p>
            <Link
              href="/login"
              className="mt-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <Input
              label="Full name"
              type="text"
              name="fullName"
              autoComplete="name"
              placeholder="Jane Doe"
              value={fullName}
              onChange={setFullName}
              error={fieldErrors.fullName}
              disabled={loading}
              required
            />
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              error={fieldErrors.email}
              disabled={loading}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={setPassword}
              error={fieldErrors.password}
              disabled={loading}
              required
            />
            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={fieldErrors.confirmPassword}
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
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary transition-colors hover:text-primary-hover"
              >
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
