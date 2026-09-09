// One-off: seed the bookable Pooja catalogue (pooja/sanskar, vehicle pooja,
// marriage registration) so the public online-booking flow has real documents
// to list. Idempotent — upserts by the unique `poojaName`, so re-running only
// updates prices/descriptions instead of creating duplicates.
//
// Run: node scripts/seedPoojas.js
import mongoose from "mongoose";
import { connectDb } from "../src/configs/db.js";
import { Pooja } from "../src/services/bookings/models/pooja.model.js";
import { PoojaCategory } from "../src/services/bookings/models/poojaCategory.model.js";

// Category buckets each pooja is filed under. Seeded first, then referenced by
// name when assigning `category` on each pooja below.
const CAT_SANSKAR = "पूजा / संस्कार (Pooja & Sanskar)";
const CAT_VEHICLE = "वाहन पूजा (Vehicle Pooja)";
const CAT_MARRIAGE = "शादी - विवाह (Marriage Registration)";
const CATEGORY_NAMES = [CAT_SANSKAR, CAT_VEHICLE, CAT_MARRIAGE];

// Prices are in rupees (the booking service converts to paise). Names are kept
// bilingual (Hindi + English) since the model stores a single `poojaName`.
const POOJAS = [
  // --- पूजा / संस्कार (Pooja & Sanskar) ---
  {
    poojaName: "रुद्राभिषेक (Rudrabhishek)",
    description: "पावन हरि-हर शिव लिंग पर जलाभिषेक व वेदमंत्रों के साथ विशेष पूजन।",
    price: 500,
    categoryName: CAT_SANSKAR,
  },
  {
    poojaName: "मुंडन (Mundan Sanskar)",
    description: "बच्चों का प्रथम मुंडन संस्कार अनुष्ठान (प्रति बच्चा)।",
    price: 75,
    categoryName: CAT_SANSKAR,
  },
  {
    poojaName: "सत्य नारायण कथा (Satyanarayan Katha)",
    description: "पारंपरिक श्री सत्यनारायण स्वामी व्रत कथा पाठ व प्रसाद वितरण।",
    price: 250,
    categoryName: CAT_SANSKAR,
  },
  {
    poojaName: "जनेऊ (Janeu / Upanayana)",
    description: "पवित्र यज्ञोपवीत धारण (जनेऊ) संस्कार अनुष्ठान।",
    price: 500,
    categoryName: CAT_SANSKAR,
  },
  // --- वाहन पूजा (Vehicle Pooja) ---
  {
    poojaName: "दो चक्का वाहन पूजा (Two-Wheeler Pooja)",
    description: "साइकिल, मोटरसाइकिल, स्कूटर वाहन पूजन व रक्षा सूत्र।",
    price: 100,
    categoryName: CAT_VEHICLE,
  },
  {
    poojaName: "तीन चक्का वाहन पूजा (Three-Wheeler Pooja)",
    description: "ऑटो रिक्शा, ई-रिक्शा वाहन पूजन।",
    price: 200,
    categoryName: CAT_VEHICLE,
  },
  {
    poojaName: "चार चक्का वाहन पूजा (Four-Wheeler Pooja)",
    description: "कार, जीप, एसयूवी, वैन वाहन पूजन।",
    price: 250,
    categoryName: CAT_VEHICLE,
  },
  {
    poojaName: "छः चक्का वाहन पूजा (Six-Wheeler Pooja)",
    description: "ट्रक, बस व भारी कामर्शियल वाहन पूजन।",
    price: 300,
    categoryName: CAT_VEHICLE,
  },
  // --- शादी - विवाह (Marriage Registration) ---
  {
    poojaName: "विवाह पंजीयन - कन्या पक्ष (Marriage Registration - Bride Side)",
    description: "मंदिर परिसर में विवाह हेतु कन्या पक्ष पंजीयन शुल्क।",
    price: 300,
    categoryName: CAT_MARRIAGE,
  },
  {
    poojaName: "विवाह पंजीयन - वर पक्ष (Marriage Registration - Groom Side)",
    description: "मंदिर परिसर में विवाह हेतु वर पक्ष पंजीयन शुल्क।",
    price: 500,
    categoryName: CAT_MARRIAGE,
  },
];

await connectDb();

// 1. Upsert the categories, then build a name → _id map.
await PoojaCategory.bulkWrite(
  CATEGORY_NAMES.map((name) => ({
    updateOne: { filter: { name }, update: { $set: { name } }, upsert: true },
  })),
);
const categories = await PoojaCategory.find({
  name: { $in: CATEGORY_NAMES },
}).lean();
const categoryIdByName = Object.fromEntries(
  categories.map((c) => [c.name, c._id]),
);

// 2. Upsert the poojas, assigning each its category id.
const ops = POOJAS.map(({ categoryName, ...p }) => ({
  updateOne: {
    filter: { poojaName: p.poojaName },
    update: { $set: { ...p, category: categoryIdByName[categoryName] } },
    upsert: true,
  },
}));

const result = await Pooja.bulkWrite(ops);

const upserted = result.upsertedCount ?? 0;
const modified = result.modifiedCount ?? 0;
console.log(
  `Seeded ${CATEGORY_NAMES.length} categories and pooja catalogue: ${upserted} inserted, ${modified} updated (${POOJAS.length} total).`,
);

await mongoose.disconnect();
process.exit(0);
