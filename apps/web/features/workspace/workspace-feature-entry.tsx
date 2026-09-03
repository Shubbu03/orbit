import type { SessionUser } from "@/lib/auth-session";

import { WorkspaceShell } from "./ui/workspace-shell";
import { WorkspaceUserProvider } from "./workspace-user-context";

export function WorkspaceFeatureEntry({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  return (
    <WorkspaceUserProvider user={user}>
      <WorkspaceShell user={user}>{children}</WorkspaceShell>
    </WorkspaceUserProvider>
  );
}
