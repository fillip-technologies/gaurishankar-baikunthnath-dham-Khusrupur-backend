import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .email("Invalid email address")
    .transform((value) => value.toLowerCase().trim()),
  password: z
    .string()
    .min(6, "Password must be at lest 6 character long")
    .max(100, "Password can not exceed 100 chracters"),
});

export const creationSchema = z.object({
  fullname: z
    .string()
    .min(3, "Name must be at least 3 character long")
    .max(50, "Name can not exceed 50 characters"),
  mobile_number: z
    .string()
    .min(10, "Mobile number must be a 10 digit number")
    .max(15, "Phone number cannot exceed 15 digits"),
  email: z
    .email("Invalid email address")
    .transform((value) => value.toLowerCase().trim()),
  password: z
    .string()
    .min(6, "Password must be at lest 6 character long")
    .max(100, "Password can not exceed 100 chracters"),
});
