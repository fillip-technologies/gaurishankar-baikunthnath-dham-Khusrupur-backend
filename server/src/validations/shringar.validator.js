import { z } from "zod";

// Shared field definitions. The daily shringar carries a lot of optional,
// descriptive fields; multipart form values arrive as strings. Everything is
// optional so partial payloads (and edits that only touch one field) pass —
// the image itself is handled by multer and checked in the controller/service.
const shringarFields = {
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  titleEn: z.string().trim().max(200).optional(),
  titleHi: z.string().trim().max(200).optional(),
  subtitleEn: z.string().trim().max(300).optional(),
  subtitleHi: z.string().trim().max(300).optional(),
  descriptionEn: z.string().trim().max(4000).optional(),
  descriptionHi: z.string().trim().max(4000).optional(),
  date: z.string().trim().max(40).optional(),
  timeSlot: z.string().trim().max(60).optional(),
  chant: z.string().trim().max(600).optional(),
  flowers: z.string().trim().max(400).optional(),
  chandan: z.string().trim().max(400).optional(),
  silks: z.string().trim().max(400).optional(),
  darshanHours: z.string().trim().max(200).optional(),
  priestName: z.string().trim().max(200).optional(),
  status: z.string().trim().max(40).optional(),
};

// Extra keys the client may send (base64 preview, etc.) are stripped rather than
// rejected, keeping the endpoint forgiving of the rich admin form payload.
const shringarSchema = z.object({
  body: z.object(shringarFields),
});

// Edit uses the same lenient shape — every field remains optional.
export const shringarUpdateSchema = shringarSchema;

export default shringarSchema;
