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

/** A plate carried in from a check result link: letters and digits only. */
export function cleanPlateParam(value: string | null | undefined) {
  const plate = (value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  return plate.length >= 4 ? plate : "";
}

/** Adds a plate to the signed-in person's watch list. */
export async function watchPlate(plate: string) {
  const response = await fetch("/api/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plate }),
  });
  return response.ok;
}
