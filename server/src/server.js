import {app} from "./app.js"
import { envConfig } from "./configs/env.config.js"


app.listen(envConfig.PORT, () => {
    console.log(`App is listening to ${envConfig.PORT}`);
})