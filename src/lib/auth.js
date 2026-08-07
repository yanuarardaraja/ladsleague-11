import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "efo_admin";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET belum diisi (minimal 16 karakter).");
  return s;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(token) {
  if (!token || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  const expect = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(mac), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}

export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real) throw new Error("ADMIN_PASSWORD belum diisi.");
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function startSession() {
  const token = sign({ role: "admin", exp: Date.now() + 1000 * 60 * 60 * 24 * 14 });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 14,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  try { return !!verify((await cookies()).get(COOKIE)?.value); }
  catch { return false; }
}
