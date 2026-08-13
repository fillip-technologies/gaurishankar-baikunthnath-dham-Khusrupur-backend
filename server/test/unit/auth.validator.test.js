import { describe, it, expect } from "vitest";
import {
  loginSchema,
  adminCreationSchema,
  otpSchema,
  passwordSchema,
  removeAdminSchema,
} from "../../src/validations/auth.validator.js";

describe("auth validators", () => {
  describe("loginSchema", () => {
    it("accepts a valid body and trims + lowercases the email", () => {
      const result = loginSchema.safeParse({
        body: { email: "  USER@Test.com  ", password: "secret123" },
      });
      expect(result.success).toBe(true);
      expect(result.data.body.email).toBe("user@test.com");
    });

    it("rejects a missing password", () => {
      const result = loginSchema.safeParse({
        body: { email: "user@test.com" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid email", () => {
      const result = loginSchema.safeParse({
        body: { email: "not-an-email", password: "secret123" },
      });
      expect(result.success).toBe(false);
    });

    it("requires the body envelope (top-level fields fail)", () => {
      const result = loginSchema.safeParse({
        email: "user@test.com",
        password: "secret123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("otpSchema", () => {
    it("accepts a 6-digit numeric otp", () => {
      expect(otpSchema.safeParse({ body: { otp: "123456" } }).success).toBe(
        true,
      );
    });

    it.each([["12345"], ["1234567"], ["12a456"], [""]])(
      "rejects invalid otp %s",
      (otp) => {
        expect(otpSchema.safeParse({ body: { otp } }).success).toBe(false);
      },
    );
  });

  describe("adminCreationSchema", () => {
    it("accepts a full valid payload", () => {
      const result = adminCreationSchema.safeParse({
        body: {
          fullname: "Jane Doe",
          mobile_number: "9876543210",
          email: "jane@test.com",
          password: "secret123",
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects a short mobile number", () => {
      const result = adminCreationSchema.safeParse({
        body: {
          fullname: "Jane Doe",
          mobile_number: "123",
          email: "jane@test.com",
          password: "secret123",
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("passwordSchema", () => {
    it("accepts valid current + new passwords", () => {
      const result = passwordSchema.safeParse({
        body: { current_password: "oldpass1", newpassword: "newpass1" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects a too-short new password", () => {
      const result = passwordSchema.safeParse({
        body: { current_password: "oldpass1", newpassword: "123" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("removeAdminSchema", () => {
    it("normalizes the admin email", () => {
      const result = removeAdminSchema.safeParse({
        body: { adminEmail: "TARGET@Test.com", superAdminPassword: "secret123" },
      });
      expect(result.success).toBe(true);
      expect(result.data.body.adminEmail).toBe("target@test.com");
    });
  });
});
