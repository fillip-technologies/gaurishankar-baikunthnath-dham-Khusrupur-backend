// One-off: seed the bookable Prasad catalogue so the public online-booking flow
// has real documents to list. Idempotent — upserts by the unique `prasadName`, so
// re-running only updates prices/descriptions instead of creating duplicates.
//
// Note: images are optional on the Prasad model, so seeded items have no image
// until an admin edits one in via the catalogue UI.
//
// Run: node scripts/seedPrasads.js
import mongoose from "mongoose";
import { connectDb } from "../src/configs/db.js";
import { Prasad } from "../src/services/bookings/models/prasad.model.js";

// Prices are `pricePerKg` in rupees (the booking service converts to paise and
// multiplies by the ordered quantity in kg). Names are kept bilingual since the
// model stores a single `prasadName`.
const PRASADS = [
  {
    prasadName: "मोतीचूर लड्डू (Motichoor Laddoo)",
    description: "शुद्ध देशी घी में बने पारंपरिक मोतीचूर लड्डू।",
    pricePerKg: 400,
  },
  {
    prasadName: "बूंदी प्रसाद (Boondi Prasad)",
    description: "मंदिर की पवित्र बूंदी, भोग हेतु उपयुक्त।",
    pricePerKg: 240,
  },
  {
    prasadName: "पंचामृत (Panchamrit)",
    description: "दूध, दही, घी, शहद व शक्कर से बना पवित्र पंचामृत।",
    pricePerKg: 300,
  },
  {
    prasadName: "खीर प्रसाद (Kheer Prasad)",
    description: "चावल, दूध व मेवों से बनी सुगंधित खीर।",
    pricePerKg: 320,
  },
  {
    prasadName: "ड्राई फ्रूट प्रसाद (Dry Fruit Prasad)",
    description: "काजू, बादाम व मखाने से युक्त विशेष मेवा प्रसाद।",
    pricePerKg: 800,
  },
  {
    prasadName: "तुलसी चरणामृत (Tulsi Charnamrit)",
    description: "तुलसी दल सहित पवित्र चरणामृत।",
    pricePerKg: 150,
  },
];

await connectDb();

const ops = PRASADS.map((p) => ({
  updateOne: {
    filter: { prasadName: p.prasadName },
    update: { $set: p },
    upsert: true,
  },
}));

const result = await Prasad.bulkWrite(ops);

const upserted = result.upsertedCount ?? 0;
const modified = result.modifiedCount ?? 0;
console.log(
  `Seeded prasad catalogue: ${upserted} inserted, ${modified} updated (${PRASADS.length} total).`,
);

await mongoose.disconnect();
process.exit(0);
