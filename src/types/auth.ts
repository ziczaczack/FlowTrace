export type AuthError = {
  message: string;
};

/**
 * Maps raw Supabase auth error messages to user-friendly strings.
 * Falls back to a generic message for unknown errors.
 */
export function toAuthError(error: unknown): AuthError {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const map: Record<string, string> = {
    "Invalid login credentials": "Incorrect email or password.",
    "Email not confirmed":
      "Please confirm your email address before signing in.",
    "User already registered": "An account with this email already exists.",
    "Password should be at least 6 characters":
      "Password must be at least 8 characters.",
    "Signup requires a valid password": "Please enter a valid password.",
    "Unable to validate email address: invalid format":
      "Please enter a valid email address.",
  };

  if (raw && map[raw]) {
    return { message: map[raw] };
  }

  if (raw.toLowerCase().includes("network")) {
    return { message: "Network error. Please check your connection." };
  }

  return {
    message: raw || "Something went wrong. Please try again.",
  };
}
