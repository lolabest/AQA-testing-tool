"use client";

import { FormEvent, useState } from "react";

import { Button, Field, Input } from "@testpilot/ui";

import { setClientAccessToken } from "@/lib/client-session";
import { sanitizeNextPath } from "@/lib/session-cookie";

export default function SignInPage() {
  const [email, setEmail] = useState("qa@testpilot.local");
  const [password, setPassword] = useState("TestPilot1!");
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
        accessToken?: string;
      };

      if (!response.ok) {
        const detail = payload.message ?? payload.error;
        if (response.status >= 500 && !detail) {
          throw new Error(
            "Sign-in service is temporarily unavailable. Refresh and try again.",
          );
        }
        throw new Error(detail ?? "Sign-in failed.");
      }

      if (!payload.accessToken) {
        throw new Error("Sign-in succeeded but no access token was returned.");
      }

      setClientAccessToken(payload.accessToken);

      const params = new URLSearchParams(window.location.search);
      const target = sanitizeNextPath(
        params.get("next"),
        params.get("_ingress_token"),
      );
      window.location.assign(target);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
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
