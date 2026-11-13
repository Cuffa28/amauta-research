// Eligibility for the published research area. The API and RLS also require
// an authenticated user and active portal membership; this is not sufficient alone.
export function canReadResearch(email: string | null | undefined): boolean {
  return typeof email === "string" && /^[^@\s]+@amautainversiones\.com$/i.test(email);
}
