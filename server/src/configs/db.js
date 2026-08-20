import mongoose from "mongoose";
import dns from "node:dns";
import { envConfig } from "./env.config.js";
import logger from "../utils/logger.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const connectDb = async () => {
  const tries = 3;
  let retries = 0;
  while (tries > retries) {
    try {
      logger.info(`Connecting to MongoDB... Attempt ${retries + 1}`);

      await mongoose.connect(envConfig.MONGO_URI, {
        dbName: "Shree_Gaurishankar_Temple",
        serverSelectionTimeoutMS: 5000,
      });

      logger.info("✅ Mongoose Connected");
      return;
    } catch (err) {
      retries++;
      logger.error({ err }, `❌ Error connecting to the database (attempt ${retries})`);
      if (retries >= tries) {
        logger.fatal("Maximum retries reached — exiting");
        process.exit(1);
      }

      const delay = Math.min(2000*2**(retries-1), 10000);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
