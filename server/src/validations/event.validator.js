import { z } from "zod";

// Shared field definitions. Multipart form fields arrive as strings; eventDate
// is coerced into a Date here.
const eventFields = {
  eventName: z.string().trim().min(3).max(100),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(5).max(255),
  eventDate: z.coerce.date({ error: "A valid event date is required" }),
};

const eventSchema = z.object({
  body: z.object(eventFields),
});

// Edit: every field optional (partial update; new image also optional).
export const eventUpdateSchema = z.object({
  body: z.object({
    eventName: eventFields.eventName.optional(),
    title: eventFields.title.optional(),
    description: eventFields.description.optional(),
    eventDate: eventFields.eventDate.optional(),
  }),
});

// Used by the "get events on a chosen date" route (e.g. ?date=2026-08-21).
export const eventDateQuerySchema = z.object({
  query: z.object({
    date: z.coerce.date({ error: "A valid date is required" }),
  }),
});

export default eventSchema;
