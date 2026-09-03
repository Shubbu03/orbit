import { notFound } from "next/navigation";
import { z } from "zod";

import { AcceptInvitationPage } from "@/features/organisations/ui/accept-invitation-page";

export default async function InvitationRoute({
  params,
}: {
  params: Promise<{ organisationId: string }>;
}) {
  const { organisationId } = await params;
  const parsedId = z.uuid().safeParse(organisationId);

  if (!parsedId.success) {
    notFound();
  }

  return <AcceptInvitationPage organisationId={parsedId.data} />;
}
