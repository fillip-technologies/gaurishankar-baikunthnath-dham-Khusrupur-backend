import { z } from "zod";

// `facilities` arrives from multipart/form-data either as a single comma/newline
// separated string or as a repeated field (array). Both are accepted here and
// normalised to a clean string[] in the service layer.
const facilitiesField = z.union([z.string().trim(), z.array(z.string())]).optional();

export const addRoomSchema = z.object({
  body: z.object({
    roomType: z
      .string()
      .trim()
      .min(3, "Room type must be at least 3 characters long")
      .max(100, "Room type can not be more than 100 characters"),
    description: z
      .string()
      .trim()
      .min(3, "Description must be at least 3 characters long")
      .max(500, "Description can not be more than 500 characters")
      .optional(),
    facilities: facilitiesField,
    price: z.coerce.number().positive("Price must be greater than 0"),
    totalRooms: z.coerce
      .number()
      .int("Total rooms must be an integer")
      .positive("Total rooms must be greater than 0"),
  }),
});

export const updateRoomSchema = z.object({
  body: z.object({
    roomType: z
      .string()
      .trim()
      .min(3, "Room type must be at least 3 characters long")
      .max(100, "Room type can not be more than 100 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .min(3, "Description must be at least 3 characters long")
      .max(500, "Description can not be more than 500 characters")
      .optional(),
    facilities: facilitiesField,
    price: z.coerce.number().positive("Price must be greater than 0").optional(),
    // Adjusting the inventory size; the service keeps availableRooms consistent.
    totalRooms: z.coerce
      .number()
      .int("Total rooms must be an integer")
      .min(0, "Total rooms cannot be negative")
      .optional(),
  }),
});

// A calendar day at UTC midnight. Accepts "YYYY-MM-DD" (or any parseable date)
// and normalises to the start of that day so night-by-night math is exact.
const dayOnly = (label) =>
  z.coerce
    .date({ message: `A valid ${label} date is required` })
    .transform((d) => {
      const utc = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      );
      return utc;
    });

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_NIGHTS = 30;

// Shared check-in/check-out rules: check-in today or later, check-out strictly
// after check-in, and the stay capped so the per-night availability walk can't
// be abused with an enormous range.
const stayRange = {
  checkIn: dayOnly("check-in"),
  checkOut: dayOnly("check-out"),
};

const refineStay = (schemaObj) =>
  schemaObj
    .refine(
      ({ checkIn }) => {
        const today = new Date();
        const todayUtc = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate(),
          ),
        );
        return checkIn.getTime() >= todayUtc.getTime();
      },
      { message: "Check-in date cannot be in the past", path: ["checkIn"] },
    )
    .refine(({ checkIn, checkOut }) => checkOut.getTime() > checkIn.getTime(), {
      message: "Check-out must be after check-in",
      path: ["checkOut"],
    })
    .refine(
      ({ checkIn, checkOut }) =>
        (checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY <= MAX_NIGHTS,
      { message: `Stay cannot exceed ${MAX_NIGHTS} nights`, path: ["checkOut"] },
    );

export const roomAvailabilitySchema = z.object({
  query: refineStay(z.object({ ...stayRange })),
});

export const bookRoomSchema = z.object({
  body: refineStay(
    z.object({
      // Which room type to book. The price/amount is looked up on the server from
      // this id — the client never sends the amount.
      roomId: z
        .string()
        .trim()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid roomId"),
      quantity: z.coerce
        .number()
        .int("Quantity must be an integer")
        .positive("Quantity must be a positive number")
        .default(1),
      ...stayRange,
      payer: z.object({
        name: z
          .string()
          .trim()
          .min(3, "Name must be at least 3 characters long")
          .max(50, "Name can not be more than 50 characters"),
        email: z
          .string()
          .trim()
          .toLowerCase()
          .email("A valid email is required"),
        phone: z
          .string()
          .trim()
          .regex(/^\d{10,14}$/, "Phone number must contain 10-14 digits"),
      }),
    }),
  ),
});

export const verifyRoomBookingSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().trim().min(1, "razorpayOrderId is required"),
    razorpayPaymentId: z.string().trim().min(1, "razorpayPaymentId is required"),
    razorpaySignature: z.string().trim().min(1, "razorpaySignature is required"),
  }),
});
