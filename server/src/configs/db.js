import mongoose from "mongoose";
import dns from "node:dns";
import { envConfig } from "./env.config.js";

dns.setServers(["8.8.8.8", "1.1.1.1", ]);

export const connectDb = async () => {
  try {
    await mongoose.connect(envConfig.MONGO_URI, {
      dbName: "Shree_Gaurishankar_Temple",
    });
    console.log("Connected")
  } catch (err) {
    console.error("Error connecting to the database \n", err);
  }
};

