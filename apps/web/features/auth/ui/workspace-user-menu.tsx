"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function WorkspaceUserMenu({ name }: { name: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    const result = await authClient.signOut();

    if (result.error) {
      setIsSigningOut(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <button
      aria-label={`Sign out ${name}`}
      className="grid size-10 place-items-center rounded-full border border-border bg-surface text-muted-foreground transition hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
      disabled={isSigningOut}
      onClick={() => void signOut()}
      title="Sign out"
      type="button"
    >
      <SignOutIcon aria-hidden className="size-[18px]" weight="bold" />
    </button>
  );
}
