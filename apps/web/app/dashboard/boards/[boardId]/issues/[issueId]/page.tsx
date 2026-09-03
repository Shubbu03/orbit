import { notFound } from "next/navigation";
import { z } from "zod";

import { IssueDetailsPage } from "@/features/issues/ui/issue-details-page";

const paramsSchema = z
  .object({ boardId: z.uuid(), issueId: z.uuid() })
  .strict();

export default async function IssueRoute({
  params,
}: {
  params: Promise<{ boardId: string; issueId: string }>;
}) {
  const parsedParams = paramsSchema.safeParse(await params);

  if (!parsedParams.success) {
    notFound();
  }

  return <IssueDetailsPage {...parsedParams.data} />;
}
