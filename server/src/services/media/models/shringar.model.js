import mongoose from "mongoose";

// The daily "shringar" (deity adornment) shown on the public Pooja-Aarti page and
// managed from the admin dashboard. The schema is intentionally lenient: only the
// image fields describe the Cloudinary asset, everything else is optional so that
// partial payloads and text-only seed records are accepted without failing.
const shringarSchema = new mongoose.Schema(
  {
    // Legacy / simple fields (kept for backward compatibility with older records).
    title: { type: String, trim: true },
    description: { type: String, trim: true },

    // Bilingual titles & subtitles (the admin form + public page use these).
    titleEn: { type: String, trim: true },
    titleHi: { type: String, trim: true },
    subtitleEn: { type: String, trim: true },
    subtitleHi: { type: String, trim: true },

    // Bilingual long descriptions.
    descriptionEn: { type: String, trim: true },
    descriptionHi: { type: String, trim: true },

    // Ritual / darshan metadata.
    date: { type: String, trim: true },
    timeSlot: { type: String, trim: true },
    chant: { type: String, trim: true },
    flowers: { type: String, trim: true },
    chandan: { type: String, trim: true },
    silks: { type: String, trim: true },
    darshanHours: { type: String, trim: true },
    priestName: { type: String, trim: true },
    status: { type: String, trim: true, default: "Published" },

    // The single "aaj ka shringar" shown publicly. Exactly one record should be
    // active at a time — the create/activate services enforce this invariant.
    isTodayActive: { type: Boolean, default: false },

    // Cloudinary image. Optional so text-only records (e.g. seeds) are allowed;
    // the frontend falls back to a bundled default image when it is absent.
    imageUrl: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Shringar = mongoose.model("Shringar", shringarSchema);
