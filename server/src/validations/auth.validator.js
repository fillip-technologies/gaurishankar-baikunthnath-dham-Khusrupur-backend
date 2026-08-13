import { z } from "zod";

// Trim first so surrounding whitespace doesn't fail the email check, then
// validate the format, then normalize to lowercase.
const emailField = z
  .string()
  .trim()
  .pipe(z.email("Invalid email address"))
  .transform((value) => value.toLowerCase());

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z
      .string()
      .min(6, "Password must be at lest 6 character long")
      .max(100, "Password can not exceed 100 chracters"),
  }),
});

export const adminCreationSchema = z.object({
  body: z.object({
    fullname: z
      .string()
      .min(3, "Name must be at least 3 character long")
      .max(50, "Name can not exceed 50 characters"),
    mobile_number: z
      .string()
      .min(10, "Mobile number must be a 10 digit number")
      .max(15, "Phone number cannot exceed 15 digits"),
    email: emailField,
    password: z
      .string()
      .min(6, "Password must be at lest 6 character long")
      .max(100, "Password can not exceed 100 chracters"),
  }),
});

export const otpSchema = z.object({
  body: z.object({
    otp: z
      .string()
      .trim()
      .min(6, "Otp must be of 6 digit")
      .max(6, "Otp must be of 6 digit")
      .regex(/^\d{6}$/, "OTP must be a 6-digit number"),
  }),
});

export const passwordSchema = z.object({
  body: z.object({
    current_password: z
      .string()
      .min(6, "Password must be at least 6 character long")
      .max(100, "Password can not exceed 100 chracters"),
    newpassword: z
      .string()
      .min(6, "Password must be at lest 6 character long")
      .max(100, "Password can not exceed 100 chracters"),
  }),
});

export const removeAdminSchema = z.object({
  body: z.object({
    adminEmail: emailField,
    superAdminPassword: z
      .string()
      .min(6, "Password must be at lest 6 character long")
      .max(100, "Password can not exceed 100 chracters"),
  }),
});
