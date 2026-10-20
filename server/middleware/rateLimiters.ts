import rateLimit from "express-rate-limit";

export const agentRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const renderRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
});
