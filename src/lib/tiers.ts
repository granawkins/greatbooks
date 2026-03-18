/**
 * Subscription tier definitions and helpers.
 * Shared between Next.js server code and the chat server.
 */

export type Tier = "anonymous" | "basic" | "plus" | "premium";

export const TIER_LIMITS = {
  anonymous: { audioMinutesPerMonth: 0, creditsPerMonth: 0 },
  basic: { audioMinutesPerMonth: 5, creditsPerMonth: 50 },
  plus: { audioMinutesPerMonth: Infinity, creditsPerMonth: 250 },
  premium: { audioMinutesPerMonth: Infinity, creditsPerMonth: Infinity },
} as const;

/** 1 credit = $0.002 real API cost */
export const CREDIT_COST_USD = 0.002;

export function costToCredits(costUsd: number): number {
  return Math.round((costUsd / CREDIT_COST_USD) * 100) / 100;
}

/**
 * Resolve a user's effective tier from their DB row.
 * - No email → anonymous (regardless of tier column)
 * - Paid tier with expired date → basic
 */
export function resolveUserTier(user: {
  email: string | null;
  tier?: string | null;
  tier_expires_at?: string | null;
}): Tier {
  if (!user.email) return "anonymous";

  const tier = (user.tier as Tier) || "basic";
  if (tier === "anonymous") return "basic"; // logged-in users are at least basic

  // Check expiration for paid tiers
  if ((tier === "plus" || tier === "premium") && user.tier_expires_at) {
    const expiresAt = new Date(user.tier_expires_at + "Z").getTime();
    if (Date.now() > expiresAt) return "basic";
  }

  return tier;
}

/** Convert tier audio limit to milliseconds */
export function audioLimitMs(tier: Tier): number {
  const minutes = TIER_LIMITS[tier].audioMinutesPerMonth;
  return minutes === Infinity ? Infinity : minutes * 60 * 1000;
}

/** Get current month string in YYYY-MM format (UTC) */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
