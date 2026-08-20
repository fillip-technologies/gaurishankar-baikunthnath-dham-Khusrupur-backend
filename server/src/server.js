import { envConfig } from "./configs/env.config.js";
import  app  from "./app.js";
import { connectDb } from "./configs/db.js";
import logger from "./utils/logger.js";


const startServer = async () => {
  try {
    await connectDb();
    app.listen(envConfig.PORT, () => {
    logger.info(`✅ Server listening on port ${envConfig.PORT}`);
    });
  } catch (e) {
    logger.fatal({ err: e }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
