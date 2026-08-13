import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import {
  authenticate,
  requireValidSession,
} from "../../src/middlewares/verifyToken.middleware.js";
import { makeAdmin } from "../helpers/factories.js";

const next = () => vi.fn();

describe("authenticate", () => {
  it("rejects a request with no access token", () => {
    const n = next();
    authenticate({ cookies: {} }, {}, n);
    const err = n.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it("sets req.user from a valid token and calls next()", () => {
    const token = jwt.sign(
      { _id: "abc", sessionId: "s1" },
      process.env.ACCESS_TOKEN_SECRET,
    );
    const req = { cookies: { accessToken: token } };
    const n = next();
    authenticate(req, {}, n);
    expect(n).toHaveBeenCalledWith(); // no error
    expect(req.user._id).toBe("abc");
  });

  it("forwards a JWT verification error", () => {
    const req = { cookies: { accessToken: "garbage" } };
    const n = next();
    authenticate(req, {}, n);
    expect(n.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});

describe("requireValidSession", () => {
  it("passes and attaches req.userDoc when the session matches", async () => {
    const user = await makeAdmin({ sessionId: "live-session" });
    const req = { user: { _id: user._id.toString(), sessionId: "live-session" } };
    const n = next();
    await requireValidSession(req, {}, n);
    expect(n).toHaveBeenCalledWith();
    expect(req.userDoc.email).toBe(user.email);
  });

  it("rejects with 401 when the token session is stale", async () => {
    const user = await makeAdmin({ sessionId: "new-session" });
    const req = { user: { _id: user._id.toString(), sessionId: "old-session" } };
    const n = next();
    await requireValidSession(req, {}, n);
    expect(n.mock.calls[0][0].statusCode).toBe(401);
  });
});
