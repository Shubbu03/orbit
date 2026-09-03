import { redirect } from "next/navigation";

import { WorkspaceFeatureEntry } from "@/features/workspace/workspace-feature-entry";
import { getServerSession } from "@/lib/auth-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  return (
    <WorkspaceFeatureEntry user={session.user}>
      {children}
    </WorkspaceFeatureEntry>
  );
}
