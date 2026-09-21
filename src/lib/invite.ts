import { randomInt } from "node:crypto";

export function randomInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}
