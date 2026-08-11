export const httpOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};


export const deviceCookieOptions = {
  ...httpOptions,
  maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
};

export const challengeCookieOptions = {
  ...httpOptions,
  maxAge: 1000 * 60 * 10, // 10 minutes
};
