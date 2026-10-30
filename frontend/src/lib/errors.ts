import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export interface ApiError {
  status: number | string;
  message: string;
  errors?: Record<string, unknown> | string;
}

/** Shape produced by `transformErrorResponse` in the base API. */
export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "message" in error;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isApiError(error) && error.message) return error.message;
  return fallback;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstString(value[0]);
  return undefined;
}

/**
 * Copy field-level errors from the server onto the matching form fields.
 * Returns true if at least one field error was applied.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: string[],
): boolean {
  if (!isApiError(error) || typeof error.errors !== "object" || error.errors === null) return false;
  let applied = false;
  for (const [key, value] of Object.entries(error.errors)) {
    const message = firstString(value);
    if (message && fields.includes(key)) {
      setError(key as Path<T>, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}
