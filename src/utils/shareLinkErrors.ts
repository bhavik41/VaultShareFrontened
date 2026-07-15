export function getShareLinkErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const maybeResponse = error as { response?: { data?: { message?: string } } };
    const message = maybeResponse.response?.data?.message?.toLowerCase() ?? "";

    if (message.includes("expired") || message.includes("revoked") || message.includes("not found")) {
      return "This link has expired or been revoked.";
    }
  }

  return "This share link is invalid, expired, or revoked.";
}
