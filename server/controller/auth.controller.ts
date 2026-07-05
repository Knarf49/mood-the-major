import { z } from "zod";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/user";
import { toUserDTO } from "../utils/dto";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../utils/jwt";
import {
  generateResetCode,
  hashCode,
  sendResetCodeEmail,
  sendVerificationEmail,
} from "../utils/email";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validator/auth.validator";

const SALT_ROUNDS = 12;
const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function signup(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.flattenError(parsed.error) });
  }
  const { username, email, password } = parsed.data;

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    return res.status(409).json({ error: "Username or email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    username,
    email,
    passwordHash,
    role: "user",
  });

  const code = generateResetCode(); // same 6-digit generator, reused for verification too
  user.verificationCodeHash = hashCode(code);
  user.verificationExpires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
  await user.save();

  try {
    await sendVerificationEmail(email, code);
  } catch {
    // email is best-effort; user still created
  }

  return res.status(201).json({
    user: toUserDTO(user),
    message:
      "Signup successful. Please check your email to verify your account.",
  });
}

export async function verifyEmail(req: Request, res: Response) {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.flattenError(parsed.error) });
  }
  const { email, code } = parsed.data;

  const user = await User.findOne({ email }).select(
    "+verificationCodeHash +verificationExpires",
  );
  if (!user || !user.verificationCodeHash || !user.verificationExpires) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  if (user.verificationExpires.getTime() < Date.now()) {
    return res.status(400).json({ error: "Code has expired" });
  }

  if (hashCode(code) !== user.verificationCodeHash) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  user.isVerified = true;
  user.verificationCodeHash = undefined;
  user.verificationExpires = undefined;
  await user.save();

  return res.status(200).json({ message: "Email verified successfully" });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.flattenError(parsed.error) });
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (!user.isVerified) {
    return res
      .status(403)
      .json({ error: "Please verify your email before logging in" });
  }

  const dto = toUserDTO(user);
  const accessToken = signAccessToken(dto);
  const refreshToken = signRefreshToken(dto);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return res.json({ user: dto, accessToken });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "No refresh token" });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    const payload = toUserDTO(user);
    const accessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions);
    return res.json({ user: payload, accessToken });
  } catch {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}

export function logout(req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  return res.status(200).json({ message: "Logout successfully" });
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.flattenError(parsed.error) });
  }
  const { email } = parsed.data;

  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(200)
      .json({ message: "If that email exists, a code has been sent." });
  }

  const code = generateResetCode();
  user.resetPasswordCodeHash = hashCode(code);
  user.resetPasswordExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
  await user.save();

  try {
    await sendResetCodeEmail(email, code);
  } catch {
    // email is best-effort; code still saved
  }

  return res
    .status(200)
    .json({ message: "If that email exists, a code has been sent." });
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: z.flattenError(parsed.error) });
  }
  const { email, code, newPassword } = parsed.data;

  const user = await User.findOne({ email }).select(
    "+resetPasswordCodeHash +resetPasswordExpires",
  );
  if (!user || !user.resetPasswordCodeHash || !user.resetPasswordExpires) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  if (user.resetPasswordExpires.getTime() < Date.now()) {
    return res.status(400).json({ error: "Code has expired" });
  }

  if (hashCode(code) !== user.resetPasswordCodeHash) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.resetPasswordCodeHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return res.status(200).json({ message: "Password reset successful" });
}
