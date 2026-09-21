import { cache } from "react";
import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
export { randomInviteCode } from "@/lib/invite";

// __Host- cookies can only be set over HTTPS, for the whole site, by this host
// alone, so a script on a sibling subdomain cannot plant a session. Older
// sessions issued under the plain name keep working until they expire.
const HOST_COOKIE = "__Host-plateping_session";
const LEGACY_COOKIE = "plateping_session";
const SESSION_DAYS = 7;
const JWT_ISSUER = "plateping";
const JWT_AUDIENCE = "plateping-web";
const DUMMY_PASSWORD_HASH =
  "$2b$12$jIYk.PI4yzQgTeNEW/Y3.uCO5f5ozBsDoSCs53R8.rv2.L1sps.IC";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function cookieSecure() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function cookieName() {
  return cookieSecure() ? HOST_COOKIE : LEGACY_COOKIE;
}

function sessionCookieOptions(maxAge = 60 * 60 * 24 * SESSION_DAYS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge,
  };
}

export type Session = {
  userId: string;
  orgId: string;
};

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function verifyPasswordAgainstDummy(password: string) {
  try {
    await compare(password, DUMMY_PASSWORD_HASH);
  } catch {
    // Timing cover only.
  }
}

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(session.userId)
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const store = await cookies();
  store.set(cookieName(), token, sessionCookieOptions());
}

export async function clearSession() {
  const store = await cookies();
  const names = cookieSecure() ? [HOST_COOKIE, LEGACY_COOKIE] : [LEGACY_COOKIE];
  for (const name of names) {
    store.set(name, "", sessionCookieOptions(0));
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(HOST_COOKIE)?.value ?? store.get(LEGACY_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.userId !== "string" || typeof payload.orgId !== "string") {
      return null;
    }
    return { userId: payload.userId, orgId: payload.orgId };
  } catch {
    return null;
  }
}

// Deduped per request: the layout, the page and any route handler in the same
// render share one membership lookup instead of one round trip each.
export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: session.orgId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      organization: true,
    },
  });

  return membership;
});

export function isOwner(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
) {
  return session.role === "owner";
}
