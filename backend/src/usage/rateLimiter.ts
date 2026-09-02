import * as repo from "./repository.js";

// How many photo-analysis calls (trip packing photos + wardrobe photos
// combined -- both hit the same paid Claude vision endpoint) one account
// gets per calendar month on the free tier. Override with an env var so
// this can be tuned without a code change/redeploy.
export const FREE_TIER_MONTHLY_PHOTO_SCAN_LIMIT = Number(process.env.PHOTO_SCAN_MONTHLY_LIMIT ?? 30);

export class PhotoScanLimitExceededError extends Error {
  constructor(public readonly limit: number) {
    super(`You've used all ${limit} photo scans included this month. It resets on the 1st.`);
  }
}

/**
 * Throws if the user has already used their monthly photo-scan quota;
 * otherwise records this call against it. Call this right before the
 * vision API call it's guarding -- a call that's rejected earlier (e.g. a
 * trip the user doesn't own) shouldn't consume quota, and one that fails
 * partway through the pipeline still consumed a real, billed API call.
 */
export function consumePhotoScan(userId: string): void {
  const used = repo.getMonthlyPhotoScanCount(userId);
  if (used >= FREE_TIER_MONTHLY_PHOTO_SCAN_LIMIT) {
    throw new PhotoScanLimitExceededError(FREE_TIER_MONTHLY_PHOTO_SCAN_LIMIT);
  }
  repo.incrementMonthlyPhotoScanCount(userId);
}
