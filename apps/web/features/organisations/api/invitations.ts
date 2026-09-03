import {
  acceptInvitationResponseSchema,
  inviteMemberResponseSchema,
  type AcceptInvitationInput,
  type AcceptInvitationResponse,
  type InviteMemberInput,
  type InviteMemberResponse,
} from "@orbit/contracts/entities";

import { requestApi } from "@/lib/api/client";

export function inviteMember(input: InviteMemberInput) {
  return requestApi<InviteMemberResponse>(inviteMemberResponseSchema, {
    data: input,
    method: "POST",
    url: "/invite",
  });
}

export function acceptInvitation(input: AcceptInvitationInput) {
  return requestApi<AcceptInvitationResponse>(acceptInvitationResponseSchema, {
    data: input,
    method: "POST",
    url: "/accept",
  });
}
