"use client";

import { FormEvent, useState } from "react";

import { Button, Field, Input } from "@testpilot/ui";

function postLoginPath(): string {
  const params = new URLSearchParams(window.location.search);
  let target = params.get("next") ?? "/";
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/sign-in")) {
    target = "/";
  }
  if (target.includes(":") && !target.startsWith("/?")) {
    // Guard against corrupted paths like `/sign-in:?_ingress_token=...`
    target = "/";
  }

  const ingress = params.get("_ingress_token");
  const url = new URL(target, window.location.origin);
  if (
    url.pathname === "/sign-in" ||
    url.pathname.startsWith("/sign-in/") ||
    url.pathname.includes(":")
  ) {
    url.pathname = "/";
    url.search = "";
  }
  if (ingress && !url.searchParams.has("_ingress_token")) {
    url.searchParams.set("_ingress_token", ingress);
  }
  return `${url.pathname}${url.search}`;
}

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
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
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

      // Full navigation so the newly set session cookie is always applied.
      window.location.assign(postLoginPath());
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
