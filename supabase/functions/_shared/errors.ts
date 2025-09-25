// Shared error handling utilities for Supabase Edge Functions

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { 
    return JSON.stringify(err); 
  } catch { 
    return "Unknown error"; 
  }
}

export function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(getErrorMessage(err));
}