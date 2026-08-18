import { z } from "zod";

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid reference id");

export const createOrderSchema = z.object({
  body: z.object({
    // Payer snapshot — captured on the payment, no login required.
    payer: z.object({
      name: z.string().trim().min(2, "Name must be at least 2 characters long"),
      email: z.string().trim().toLowerCase().email("A valid email is required"),
      phone: z
        .string()
        .trim()
        .regex(/^\d{10,14}$/, "Phone number must contain 10-14 digits"),
    }),

    // Amount in the smallest currency unit (paise for INR), e.g. 50000 = ₹500.
    amount: z.coerce
      .number()
      .int("Amount must be an integer (in paise)")
      .min(100, "Amount must be at least 100 (₹1)"),
    currency: z
      .string()
      .trim()
      .length(3, "Currency must be a 3-letter ISO code")
      .toUpperCase()
      .default("INR"),

    // What the payment is for. Booking flows set this internally; standalone
    // callers (e.g. a donation) may pass it directly.
    purpose: z.enum(["booking", "donation", "general"]).default("general"),
    reference: z
      .object({
        model: z.string().trim().min(1, "reference.model is required"),
        id: objectId,
      })
      .optional(),

    notes: z.record(z.string(), z.string()).optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().trim().min(1, "razorpayOrderId is required"),
    razorpayPaymentId: z.string().trim().min(1, "razorpayPaymentId is required"),
    razorpaySignature: z.string().trim().min(1, "razorpaySignature is required"),
  }),
});
