import bcrypt from "bcryptjs";

const COOKIE_NAME = "storyforge_session";
const TOKEN_PREFIX = "sfv2";
const SEPARATOR = ":";

export type SessionPayload = {
  userId: string;
  email: string;
  role: string;
};

export function createSessionToken(payload: SessionPayload): string {
  const data = [TOKEN_PREFIX, payload.userId, payload.email, payload.role].join(
    SEPARATOR,
  );
  return data;
}

export function verifySessionToken(
  token?: string | null,
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(SEPARATOR);
  if (parts.length < 4 || parts[0] !== TOKEN_PREFIX) return null;
  const [, userId, email, role] = parts;
  if (!userId || !email || !role) return null;
  return { userId, email, role };
}

export async function getSession(): Promise<SessionPayload | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
