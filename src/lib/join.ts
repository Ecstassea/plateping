/** Shape of an invite code taken from a link: letters and digits only. */
export function cleanInviteCode(value: string | null | undefined) {
  const code = (value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  return code.length >= 4 ? code : "";
}

/**
 * Joins the workspace behind an invite code. Used straight after registering or
 * signing in from an invite link, so the person never has to type the code.
 */
export async function joinWithCode(inviteCode: string) {
  const response = await fetch("/api/team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode }),
  });
  return response.ok;
}
