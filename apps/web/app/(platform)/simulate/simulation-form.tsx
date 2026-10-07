"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { EmployeeSummary } from "@/lib/api-types";
import { createSimulation } from "./actions";

export function SimulationForm({
  employees,
}: {
  employees: EmployeeSummary[];
}) {
  const [state, action, pending] = useActionState(createSimulation, {
    error: "",
  });
  return (
    <form
      action={action}
      // A form action resets the fields afterwards, which would silently
      // restore the 30-day default on a retry. Submitting in a transition
      // keeps the person's entries; `action` still covers pre-hydration posts.
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => action(form));
      }}
      className="space-y-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="employeeId">Active employee</Label>
        <NativeSelect
          id="employeeId"
          name="employeeId"
          defaultValue=""
          required
        >
          <option value="" disabled>
            Choose an employee
          </option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} · {employee.department?.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="durationDays">Unavailable for (days)</Label>
        <Input
          id="durationDays"
          name="durationDays"
          type="number"
          min={1}
          max={365}
          step={1}
          required
          defaultValue={30}
        />
        <p className="text-xs text-slate-600">Whole days, from 1 to 365.</p>
      </div>
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
        >
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating simulation…" : "Create simulation"}
      </Button>
    </form>
  );
}
