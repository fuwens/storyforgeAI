const COOKIE_NAME = "storyforge_session";

export function createSessionToken(email: string) {
  return `storyforge:${email}:authenticated`;
}

export function verifySessionToken(token?: string | null) {
  return Boolean(token?.startsWith("storyforge:") && token.endsWith(":authenticated"));
}

export async function isAuthenticated() {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function requireAuth() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new Error("UNAUTHORIZED");
  }
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}
