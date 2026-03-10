// Shared in-memory store for magic link tokens.
// Both the magic-link and verify routes import from here so they share state.

export const magicLinkTokens = new Map<
  string,
  { email: string; userId: string; returnTo: string; expiresAt: number }
>();

// Clean expired tokens every minute
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [token, data] of magicLinkTokens) {
      if (data.expiresAt < now) magicLinkTokens.delete(token);
    }
  }, 60_000);
}
