import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface TokenPayload {
  id: string;
  username: string;
  role: "user" | "admin";
}

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

export const REFRESH_COOKIE_NAME = "refreshToken";

export const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/", // routes no longer share a common prefix, so scope to root
};
