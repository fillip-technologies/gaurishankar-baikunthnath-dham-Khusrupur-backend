export const httpOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};


export const deviceCookieOptions = {
  ...httpOptions,
  maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
};

export const challengeCookieOptions = {
  ...httpOptions,
  maxAge: 1000 * 60 * 30, // 5 minutes
};



