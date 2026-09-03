"use client";

import {
  ArrowRightIcon,
  GoogleLogoIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

type AuthActionState =
  | { status: "idle" }
  | { status: "pending"; action: "sign-in" | "sign-out" }
  | { status: "error"; message: string };

export function AuthPanel({ oauthFailed }: { oauthFailed: boolean }) {
  const { data: session, isPending } = authClient.useSession();
  const [actionState, setActionState] = useState<AuthActionState>({
    status: "idle",
  });

  async function signInWithGoogle() {
    setActionState({ status: "pending", action: "sign-in" });

    try {
      const webOrigin = window.location.origin;
      const result = await authClient.signIn.social({
        callbackURL: `${webOrigin}/dashboard`,
        errorCallbackURL: webOrigin,
        provider: "google",
      });

      if (result.error) {
        setActionState({
          status: "error",
          message: "Google sign-in could not start. Please try again.",
        });
      }
    } catch {
      setActionState({
        status: "error",
        message: "The auth server is unavailable. Please try again shortly.",
      });
    }
  }

  async function signOut() {
    setActionState({ status: "pending", action: "sign-out" });

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setActionState({
          status: "error",
          message: "You could not be signed out. Please try again.",
        });
        return;
      }

      setActionState({ status: "idle" });
    } catch {
      setActionState({
        status: "error",
        message: "The auth server is unavailable. Please try again shortly.",
      });
    }
  }

  const errorMessage =
    actionState.status === "error"
      ? actionState.message
      : oauthFailed
        ? "Google sign-in did not finish. Please try again."
        : null;

  if (isPending) {
    return (
      <div aria-busy="true" className="grid gap-3">
        <div className="h-12 animate-pulse rounded-full bg-muted" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (session) {
    return (
      <div className="grid gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-mono text-sm font-bold text-secondary-foreground">
            {session.user.name.trim().charAt(0).toUpperCase() || "O"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {session.user.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">Signed in</p>
          </div>
        </div>
        <Link
          className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-hard transition hover:-translate-y-1 hover:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/dashboard"
        >
          Open dashboard
          <ArrowRightIcon
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1"
            weight="bold"
          />
        </Link>
        <button
          className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          disabled={actionState.status === "pending"}
          onClick={() => void signOut()}
          type="button"
        >
          <SignOutIcon aria-hidden className="size-4" />
          {actionState.status === "pending" && actionState.action === "sign-out"
            ? "Signing out…"
            : "Use another account"}
        </button>
        <AuthError message={errorMessage} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <button
        className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-hard transition hover:-translate-y-1 hover:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
        disabled={actionState.status === "pending"}
        onClick={() => void signInWithGoogle()}
        type="button"
      >
        <GoogleLogoIcon aria-hidden className="size-5" weight="bold" />
        {actionState.status === "pending" && actionState.action === "sign-in"
          ? "Opening Google…"
          : "Continue with Google"}
        <ArrowRightIcon
          aria-hidden
          className="size-4 transition-transform group-hover:translate-x-1"
          weight="bold"
        />
      </button>
      <AuthError message={errorMessage} />
    </div>
  );
}

function AuthError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className="text-center text-xs font-medium text-destructive"
    >
      {message}
    </p>
  );
}
