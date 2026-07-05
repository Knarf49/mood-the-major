import rateLimit from "express-rate-limit";

// Baseline limiter — applied to every route as a general abuse guard
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300, // 300 requests per IP per window — generous, just stops scraping/DDoS-lite
  message: { error: "Too many requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 attempts per IP per window
  message: { error: "Too many login attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per IP per hour — prevents email-bombing a target inbox
  message: { error: "Too many password reset requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // matches the code's own TTL
  max: 10, // 10 attempts per IP per window — code space is 1,000,000, this makes brute force impractical
  message: { error: "Too many reset attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
