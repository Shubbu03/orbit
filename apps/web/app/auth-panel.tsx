"use client";

import { useState } from "react";

import { authClient } from "../lib/auth-client";
import styles from "./page.module.css";

type AuthActionState =
  | { status: "idle" }
  | { status: "pending"; action: "sign-in" | "sign-out" }
  | { status: "error"; message: string };

type AuthPanelProps = {
  oauthFailed: boolean;
};

export function AuthPanel({ oauthFailed }: AuthPanelProps) {
  const {
    data: session,
    error: sessionError,
    isPending,
  } = authClient.useSession();
  const [actionState, setActionState] = useState<AuthActionState>({
    status: "idle",
  });

  async function signInWithGoogle() {
    setActionState({ status: "pending", action: "sign-in" });

    try {
      const webOrigin = window.location.origin;
      const result = await authClient.signIn.social({
        callbackURL: webOrigin,
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

  const actionError =
    actionState.status === "error" ? actionState.message : null;
  const errorMessage =
    actionError ??
    (sessionError
      ? "Your session could not be checked. Refresh and try again."
      : oauthFailed
        ? "Google sign-in did not finish. Please try again."
        : null);

  if (isPending) {
    return (
      <section className={styles.authCard} aria-busy="true">
        <p className={styles.eyebrow}>Secure workspace</p>
        <div className={styles.loadingLine} />
        <div className={styles.loadingBlock} />
        <span className={styles.srOnly}>Checking your session</span>
      </section>
    );
  }

  if (session) {
    const initial = session.user.name.trim().charAt(0).toUpperCase() || "O";

    return (
      <section className={styles.authCard}>
        <p className={styles.eyebrow}>Session active</p>
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <div>
            <h2>{session.user.name}</h2>
            <p>{session.user.email}</p>
          </div>
        </div>
        <p className={styles.sessionCopy}>
          You are ready to enter your Orbit workspace.
        </p>
        <button
          className={styles.secondaryButton}
          disabled={actionState.status === "pending"}
          onClick={() => void signOut()}
          type="button"
        >
          {actionState.status === "pending" && actionState.action === "sign-out"
            ? "Signing out…"
            : "Sign out"}
        </button>
        <p className={styles.error} aria-live="polite">
          {errorMessage}
        </p>
      </section>
    );
  }

  return (
    <section className={styles.authCard}>
      <p className={styles.eyebrow}>Secure workspace</p>
      <h2>Sign in to Orbit</h2>
      <p className={styles.authCopy}>
        Use your Google account to continue. Orbit only requests your basic
        profile and email.
      </p>
      <button
        className={styles.googleButton}
        disabled={actionState.status === "pending"}
        onClick={() => void signInWithGoogle()}
        type="button"
      >
        <GoogleMark />
        {actionState.status === "pending" && actionState.action === "sign-in"
          ? "Opening Google…"
          : "Continue with Google"}
      </button>
      <p className={styles.error} aria-live="polite">
        {errorMessage}
      </p>
      <p className={styles.terms}>
        A short-lived, encrypted session cookie keeps you signed in on this
        device.
      </p>
    </section>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="#4285f4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"
      />
      <path
        fill="#34a853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#fbbc05"
        d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z"
      />
      <path
        fill="#ea4335"
        d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.5 10A5.9 5.9 0 0 1 12 6Z"
      />
    </svg>
  );
}
