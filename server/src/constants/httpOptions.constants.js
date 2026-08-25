export const httpOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

// Auth cookies must OUTLIVE the browser session — without an explicit maxAge a
// cookie is a "session cookie" the browser deletes on close, which logs the
// user out even though the JWT itself is still valid. maxAge is aligned to each
// token's expiry (ACCESS_TOKEN_EXPIRES_IN=7d, REFRESH_TOKEN_EXPIRES_IN=30d).
export const accessCookieOptions = {
  ...httpOptions,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};

export const refreshCookieOptions = {
  ...httpOptions,
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
};

export const deviceCookieOptions = {
  ...httpOptions,
  maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
};

export const challengeCookieOptions = {
  ...httpOptions,
  maxAge: 1000 * 60 * 5, // 5 minutes
};



