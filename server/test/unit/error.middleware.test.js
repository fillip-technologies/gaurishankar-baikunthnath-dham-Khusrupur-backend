import { describe, it, expect, vi } from "vitest";
import { errorHandler } from "../../src/middlewares/error.middleware.js";
import ApiError from "../../src/utils/ApiError.js";
import { HTTP_STATUS } from "../../src/constants/httpStatus.constants.js";

const run = (err) => {
  const req = { method: "POST", originalUrl: "/x", ip: "::1" };
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  errorHandler(err, req, res, vi.fn());
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
};

describe("errorHandler", () => {
  it("maps ApiError to its status and message", () => {
    const { status, body } = run(
      new ApiError(HTTP_STATUS.CONFLICT, "already exists"),
    );
    expect(status).toBe(409);
    expect(body.message).toBe("already exists");
  });

  it("maps JWT errors to 401", () => {
    const err = new Error("jwt expired");
    err.name = "TokenExpiredError";
    expect(run(err).status).toBe(401);
  });

  it("maps malformed JSON (entity.parse.failed) to 400", () => {
    const err = new SyntaxError("Unexpected token");
    err.type = "entity.parse.failed";
    expect(run(err).status).toBe(400);
  });

  it("maps Mongo duplicate-key (11000) to 409", () => {
    const err = new Error("dup");
    err.code = 11000;
    expect(run(err).status).toBe(409);
  });

  it("honors an arbitrary 4xx statusCode and exposes its message", () => {
    const err = Object.assign(new Error("bad thing"), { statusCode: 418 });
    const { status, body } = run(err);
    expect(status).toBe(418);
    expect(body.message).toBe("bad thing");
  });

  it("falls back to a generic 500 for unknown errors (no internal leak)", () => {
    const { status, body } = run(new Error("stack trace secret"));
    expect(status).toBe(500);
    expect(body.message).toBe("Internal server error");
  });
});
