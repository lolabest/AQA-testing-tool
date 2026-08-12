"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Field, Input } from "@testpilot/ui";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("qa@testpilot.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? payload.error ?? "Sign-in failed.");
      }

      const target =
        typeof window === "undefined"
          ? "/"
          : new URLSearchParams(window.location.search).get("next") ?? "/";
      router.replace(target.startsWith("/") ? target : "/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-panel" aria-labelledby="sign-in-heading">
        <div className="sign-in-brand">
          <span className="brand-mark" aria-hidden="true" />
          TestPilot AI
        </div>
        <p className="eyebrow">Quality operations</p>
        <h1 id="sign-in-heading">Welcome back.</h1>
        <p>Sign in to review test health, approve coverage, and manage execution.</p>

        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}

        <form className="sign-in-form" onSubmit={submit}>
          <Field label="Email address">
            <Input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </Field>
          <Button type="submit" busy={submitting}>
            Sign in
          </Button>
        </form>
        <div className="demo-credentials">
          Seeded account: <code>qa@testpilot.local</code> / <code>TestPilot1!</code>
        </div>
      </section>
      <aside className="sign-in-aside" aria-label="Product summary">
        <blockquote>
          Quality signals that stay traceable from requirement to release.
        </blockquote>
        <p>
          TestPilot brings planning, execution, failure triage, and controlled
          healing into one operational workspace.
        </p>
      </aside>
    </main>
  );
}
