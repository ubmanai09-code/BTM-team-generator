import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  // Startup log intentionally minimal for containerized environments.
  console.log(`API listening on port ${env.PORT}`);
});
