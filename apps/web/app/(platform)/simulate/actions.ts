"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { ApiRequestError, apiPost } from "@/lib/api";
import { requireSession } from "@/lib/session";

export type SimulationFormState = { error: string };

export async function createSimulation(
  _previous: SimulationFormState,
  form: FormData,
): Promise<SimulationFormState> {
  const session = await requireSession();
  if (
    session.user.role !== "MANAGER" &&
    session.user.role !== "KNOWLEDGE_ADMIN"
  ) {
    return { error: "You do not have permission to create a simulation." };
  }
  const employeeId = form.get("employeeId");
  const rawDuration = form.get("durationDays");
  if (
    typeof employeeId !== "string" ||
    !/^emp_[a-zA-Z0-9_-]+$/.test(employeeId)
  ) {
    return { error: "Choose an active employee." };
  }
  if (
    typeof rawDuration !== "string" ||
    !/^\d+$/.test(rawDuration) ||
    Number(rawDuration) < 1 ||
    Number(rawDuration) > 365
  ) {
    return { error: "Enter a whole number of days from 1 to 365." };
  }
  let id: string;
  try {
    const response = await apiPost<{ data: { id: string } }>(
      "/simulations/unavailability",
      {
        employeeId,
        durationDays: Number(rawDuration),
      },
    );
    id = response.data.id;
  } catch (error) {
    // apiPost redirects to sign-in on an expired token; never report that as a save failure.
    unstable_rethrow(error);
    if (error instanceof ApiRequestError && error.status === 403) {
      return { error: "You do not have permission to create a simulation." };
    }
    if (error instanceof ApiRequestError && [400, 404].includes(error.status)) {
      return {
        error:
          "The employee is unavailable or the duration is invalid. Check your selection and try again.",
      };
    }
    return { error: "Could not save this simulation. Please try again." };
  }
  redirect(`/simulate/${encodeURIComponent(id)}`);
}
