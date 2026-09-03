"use client";

import type { OrganisationRecord } from "@orbit/contracts/entities";
import { BuildingsIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { CreateOrganisationForm } from "./create-organisation-form";
import { InviteMembersForm } from "./invite-members-form";

type OnboardingStep =
  | { name: "organization" }
  | { name: "members"; organisation: OrganisationRecord };

export function OrganizationOnboardingDialog({
  onComplete,
  onOrganisationCreated,
  open,
}: {
  onComplete: () => void;
  onOrganisationCreated: () => void;
  open: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<OnboardingStep>({ name: "organization" });

  useEffect(() => {
    const dialog = dialogRef.current;

    if (open && dialog && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog?.open) {
      dialog.close();
    }
  }, [open]);

  function handleCreated(organisation: OrganisationRecord) {
    onOrganisationCreated();
    setStep({ name: "members", organisation });
  }

  const isOrganizationStep = step.name === "organization";

  return (
    <dialog
      aria-labelledby="onboarding-title"
      className="m-auto w-[min(92vw,34rem)] rounded-3xl border border-border bg-surface-raised p-0 text-foreground shadow-panel backdrop:bg-foreground/30 backdrop:backdrop-blur-sm"
      onCancel={(event) => event.preventDefault()}
      ref={dialogRef}
    >
      <div className="border-b border-border px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center justify-between gap-5">
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            Step {isOrganizationStep ? "1" : "2"} of 2
          </span>
          <div aria-hidden className="flex gap-1.5">
            <span className="h-1.5 w-8 rounded-full bg-primary" />
            <span
              className={`h-1.5 w-8 rounded-full ${
                isOrganizationStep ? "bg-muted" : "bg-primary"
              }`}
            />
          </div>
        </div>

        <span className="mt-6 grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          {isOrganizationStep ? (
            <BuildingsIcon aria-hidden className="size-5" weight="duotone" />
          ) : (
            <UsersThreeIcon aria-hidden className="size-5" weight="duotone" />
          )}
        </span>
        <h1
          className="mt-4 text-2xl font-semibold tracking-[-0.04em]"
          id="onboarding-title"
        >
          {isOrganizationStep
            ? "Create your organization"
            : "Invite team members"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isOrganizationStep
            ? "Organizations contain your boards and members."
            : "Invite existing Orbit users by email, or do this later."}
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {step.name === "organization" ? (
          <CreateOrganisationForm
            onCreated={handleCreated}
            submitLabel="Continue"
          />
        ) : (
          <InviteMembersForm
            onComplete={onComplete}
            organisationId={step.organisation.id}
          />
        )}
      </div>
    </dialog>
  );
}
