"use client";

import { createContext, useContext } from "react";

import type { SessionUser } from "@/lib/auth-session";

const WorkspaceUserContext = createContext<SessionUser | null>(null);

export function WorkspaceUserProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  return (
    <WorkspaceUserContext.Provider value={user}>
      {children}
    </WorkspaceUserContext.Provider>
  );
}

export function useWorkspaceUser() {
  const user = useContext(WorkspaceUserContext);

  if (!user) {
    throw new Error(
      "useWorkspaceUser must be used within WorkspaceUserProvider",
    );
  }

  return user;
}
