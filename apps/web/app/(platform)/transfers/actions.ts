"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { ApiRequestError, apiPatch, apiPost } from "@/lib/api";
import {
  transferActivityTypes,
  transferStatuses,
  type TransferActivityType,
  type TransferStatus,
} from "@/lib/api-types";
import { requireSession } from "@/lib/session";

export type TransferFormState = { error: string; savedAt?: number };

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PERMISSION = "You do not have permission to change transfer plans.";

async function canWrite() {
  const { user } = await requireSession();
  return user.role === "MANAGER" || user.role === "KNOWLEDGE_ADMIN";
}

/** Refreshes the plan in place; a same-page redirect would not refetch it. */
function saved(planId: string): TransferFormState {
  revalidatePath(`/transfers/${planId}`);
  revalidatePath("/transfers");
  return { error: "", savedAt: Date.now() };
}

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function failure(error: unknown, invalid: string): TransferFormState {
  // apiPost/apiPatch redirect on an expired session; let that escape.
  unstable_rethrow(error);
  if (error instanceof ApiRequestError) {
    if (error.status === 403) return { error: PERMISSION };
    if (error.status === 409)
      return {
        error:
          "This change conflicts with the plan's current state. Reload the page and try again.",
      };
    if (error.status === 400 || error.status === 404) return { error: invalid };
  }
  return { error: "Could not save the change. Please try again." };
}

export async function createTransfer(
  _previous: TransferFormState,
  form: FormData,
): Promise<TransferFormState> {
  if (!(await canWrite())) return { error: PERMISSION };
  const knowledgeAreaId = field(form, "knowledgeAreaId");
  const primaryHolderId = field(form, "primaryHolderId");
  const backupEmployeeId = field(form, "backupEmployeeId");
  const targetDate = field(form, "targetDate");
  const targetCoverage = field(form, "targetCoverage");
  if (
    ![knowledgeAreaId, primaryHolderId, backupEmployeeId].every((id) =>
      ID.test(id),
    )
  )
    return { error: "Choose a primary holder and a backup." };
  if (primaryHolderId === backupEmployeeId)
    return {
      error: "The primary holder and the backup must be different people.",
    };
  if (
    !/^\d+$/.test(targetCoverage) ||
    +targetCoverage < 1 ||
    +targetCoverage > 100
  )
    return { error: "Enter a whole-number target coverage from 1 to 100." };
  if (!DATE.test(targetDate)) return { error: "Choose a target date." };

  let id: string;
  try {
    const response = await apiPost<{ data: { id: string } }>("/transfers", {
      knowledgeAreaId,
      primaryHolderId,
      backupEmployeeId,
      targetCoverage: Number(targetCoverage),
      targetDate,
    });
    id = response.data.id;
  } catch (error) {
    return failure(
      error,
      "The plan was not created. Check that the target is above the backup's current coverage, the date is within two years, and the primary holder has expertise in this area.",
    );
  }
  redirect(`/transfers/${encodeURIComponent(id)}`);
}

export async function updateTransferStatus(
  planId: string,
  _previous: TransferFormState,
  form: FormData,
): Promise<TransferFormState> {
  if (!(await canWrite())) return { error: PERMISSION };
  const status = field(form, "status") as TransferStatus;
  if (!ID.test(planId) || !transferStatuses.includes(status))
    return { error: "Choose a valid status." };
  try {
    await apiPatch(`/transfers/${encodeURIComponent(planId)}`, { status });
  } catch (error) {
    return failure(error, "That status change is not allowed.");
  }
  return saved(planId);
}

export async function addTransferActivity(
  planId: string,
  _previous: TransferFormState,
  form: FormData,
): Promise<TransferFormState> {
  if (!(await canWrite())) return { error: PERMISSION };
  const type = field(form, "type") as TransferActivityType;
  const title = field(form, "title");
  const weight = field(form, "weight") || "1";
  if (!ID.test(planId) || !transferActivityTypes.includes(type))
    return { error: "Choose an activity type." };
  if (title.length < 3 || title.length > 120)
    return { error: "Enter a title of 3 to 120 characters." };
  if (!/^(0(\.\d{1,2})?|1(\.0{1,2})?)$/.test(weight) || +weight < 0.1)
    return { error: "Enter a weight from 0.1 to 1." };
  try {
    await apiPost(`/transfers/${encodeURIComponent(planId)}/activities`, {
      type,
      title,
      weight: Number(weight),
    });
  } catch (error) {
    return failure(
      error,
      "The activity was not added. Check the values and try again.",
    );
  }
  return saved(planId);
}

export async function completeTransferActivity(
  planId: string,
  activityId: string,
): Promise<TransferFormState> {
  if (!(await canWrite())) return { error: PERMISSION };
  if (!ID.test(planId) || !ID.test(activityId))
    return { error: "Choose a valid activity." };
  try {
    await apiPatch(
      `/transfers/${encodeURIComponent(planId)}/activities/${encodeURIComponent(activityId)}`,
      { status: "COMPLETED" },
    );
  } catch (error) {
    return failure(error, "The activity could not be completed.");
  }
  return saved(planId);
}
