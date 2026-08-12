import mongoose from "mongoose";
import dns, { resolve } from "node:dns";
import { envConfig } from "./env.config.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const connectDb = async () => {
  const tries = 3;
  let retries = 0;
  while (tries > retries) {
    try {
      console.log(`Connecting to MongoDB... Attempt ${retries + 1}`);

      await mongoose.connect(envConfig.MONGO_URI, {
        dbName: "Shree_Gaurishankar_Temple",
        serverSelectionTimeoutMS: 5000,
      });

      console.log("✅ Mongoose Connected");
      return;
    } catch (err) {
      retries++;
      console.error("❌Error connecting to the database \n", err.message);
      if (retries >= tries) {
        console.log("Maximum retries has been reached");
        process.exit(1);
      }

      const delay = Math.min(2000*2**(retries-1), 10000);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
