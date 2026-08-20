import { z } from "zod";

export const addPrasadSchema = z.object({
  body: z.object({
    prasadName: z
      .string()
      .trim()
      .min(3, "Prasad name must be at least 3 characters long")
      .max(100, "Prasad name can not be more than 100 characters"),
    pricePerKg: z.coerce
      .number()
      .positive("Price per kg must be a positive number"),
    description: z
      .string()
      .min(3, "Description must be at least 3 characters long")
      .max(500, "Description can not be more than 500 characters")
      .optional(),
  }),
});

export const bookPrasadSchema = z.object({
  body: z.object({
    // Which prasad to order. The price/amount is looked up on the server from
    // this id — the client never sends the amount.
    prasadId: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid prasadId"),
    quantity: z.coerce
      .number()
      .positive("Quantity must be a positive number"),
    payer: z.object({
      name: z
        .string()
        .trim()
        .min(3, "Name must be at least 3 characters long")
        .max(50, "Name can not be more than 50 characters"),
      email: z.string().trim().toLowerCase().email("A valid email is required"),
      phone: z
        .string()
        .trim()
        .regex(/^\d{10,14}$/, "Phone number must contain 10-14 digits"),
    }),
  }),
});

export const verifyPrasadBookingSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().trim().min(1, "razorpayOrderId is required"),
    razorpayPaymentId: z.string().trim().min(1, "razorpayPaymentId is required"),
    razorpaySignature: z.string().trim().min(1, "razorpaySignature is required"),
  }),
});
