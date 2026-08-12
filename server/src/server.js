import { envConfig } from "./configs/env.config.js";
import  app  from "./app.js";
import { connectDb } from "./configs/db.js";


const startServer = async () => {
  try {
    await connectDb();
    app.listen(envConfig.PORT, () => {
    console.log(`✅ App is listening to ${envConfig.PORT}`);
    });
  } catch (e) {
    console.log(e);
  }
};

startServer();
