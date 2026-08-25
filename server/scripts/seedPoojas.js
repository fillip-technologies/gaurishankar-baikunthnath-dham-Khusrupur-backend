// One-off: seed the bookable Pooja catalogue (pooja/sanskar, vehicle pooja,
// marriage registration) so the public online-booking flow has real documents
// to list. Idempotent — upserts by the unique `poojaName`, so re-running only
// updates prices/descriptions instead of creating duplicates.
//
// Run: node scripts/seedPoojas.js
import mongoose from "mongoose";
import { connectDb } from "../src/configs/db.js";
import { Pooja } from "../src/services/bookings/models/pooja.model.js";

// Prices are in rupees (the booking service converts to paise). Names are kept
// bilingual (Hindi + English) since the model stores a single `poojaName`.
const POOJAS = [
  // --- पूजा / संस्कार (Pooja & Sanskar) ---
  {
    poojaName: "रुद्राभिषेक (Rudrabhishek)",
    description: "पावन हरि-हर शिव लिंग पर जलाभिषेक व वेदमंत्रों के साथ विशेष पूजन।",
    price: 500,
  },
  {
    poojaName: "मुंडन (Mundan Sanskar)",
    description: "बच्चों का प्रथम मुंडन संस्कार अनुष्ठान (प्रति बच्चा)।",
    price: 75,
  },
  {
    poojaName: "सत्य नारायण कथा (Satyanarayan Katha)",
    description: "पारंपरिक श्री सत्यनारायण स्वामी व्रत कथा पाठ व प्रसाद वितरण।",
    price: 250,
  },
  {
    poojaName: "जनेऊ (Janeu / Upanayana)",
    description: "पवित्र यज्ञोपवीत धारण (जनेऊ) संस्कार अनुष्ठान।",
    price: 500,
  },
  // --- वाहन पूजा (Vehicle Pooja) ---
  {
    poojaName: "दो चक्का वाहन पूजा (Two-Wheeler Pooja)",
    description: "साइकिल, मोटरसाइकिल, स्कूटर वाहन पूजन व रक्षा सूत्र।",
    price: 100,
  },
  {
    poojaName: "तीन चक्का वाहन पूजा (Three-Wheeler Pooja)",
    description: "ऑटो रिक्शा, ई-रिक्शा वाहन पूजन।",
    price: 200,
  },
  {
    poojaName: "चार चक्का वाहन पूजा (Four-Wheeler Pooja)",
    description: "कार, जीप, एसयूवी, वैन वाहन पूजन।",
    price: 250,
  },
  {
    poojaName: "छः चक्का वाहन पूजा (Six-Wheeler Pooja)",
    description: "ट्रक, बस व भारी कामर्शियल वाहन पूजन।",
    price: 300,
  },
  // --- शादी - विवाह (Marriage Registration) ---
  {
    poojaName: "विवाह पंजीयन - कन्या पक्ष (Marriage Registration - Bride Side)",
    description: "मंदिर परिसर में विवाह हेतु कन्या पक्ष पंजीयन शुल्क।",
    price: 300,
  },
  {
    poojaName: "विवाह पंजीयन - वर पक्ष (Marriage Registration - Groom Side)",
    description: "मंदिर परिसर में विवाह हेतु वर पक्ष पंजीयन शुल्क।",
    price: 500,
  },
];

await connectDb();

const ops = POOJAS.map((p) => ({
  updateOne: {
    filter: { poojaName: p.poojaName },
    update: { $set: p },
    upsert: true,
  },
}));

const result = await Pooja.bulkWrite(ops);

const upserted = result.upsertedCount ?? 0;
const modified = result.modifiedCount ?? 0;
console.log(
  `Seeded pooja catalogue: ${upserted} inserted, ${modified} updated (${POOJAS.length} total).`,
);

await mongoose.disconnect();
process.exit(0);
