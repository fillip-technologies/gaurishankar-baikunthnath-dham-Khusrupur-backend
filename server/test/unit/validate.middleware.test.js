import { describe, it, expect, vi } from "vitest";
import { validate } from "../../src/middlewares/validate.middleware.js";
import { loginSchema } from "../../src/validations/auth.validator.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("validate middleware", () => {
  it("passes valid input, sets req.validated, and calls next", () => {
    const req = {
      body: { email: "user@test.com", password: "secret123" },
      params: {},
      query: {},
    };
    const res = mockRes();
    const next = vi.fn();

    validate(loginSchema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.validated.body.email).toBe("user@test.com");
  });

  it("responds 400 with issues on invalid input and does not call next", () => {
    const req = { body: { email: "bad" }, params: {}, query: {} };
    const res = mockRes();
    const next = vi.fn();

    validate(loginSchema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(Array.isArray(payload.errors)).toBe(true);
    expect(payload.errors.length).toBeGreaterThan(0);
  });
});
