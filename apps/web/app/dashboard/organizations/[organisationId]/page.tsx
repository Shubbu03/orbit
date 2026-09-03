import { notFound } from "next/navigation";
import { z } from "zod";

import { BoardsPage } from "@/features/boards/ui/boards-page";

export default async function OrganizationBoardsRoute({
  params,
}: {
  params: Promise<{ organisationId: string }>;
}) {
  const { organisationId } = await params;
  const parsedOrganisationId = z.uuid().safeParse(organisationId);

  if (!parsedOrganisationId.success) {
    notFound();
  }

  return <BoardsPage organisationId={parsedOrganisationId.data} />;
}
