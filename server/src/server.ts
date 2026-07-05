import "dotenv/config"; // load .env before anything else reads process.env
import app from "./app";
import { connectDB, gracefulShutdown } from "../utils/db";

const PORT = process.env.PORT || 4000;

async function startServer() {
  await connectDB(); // connects to MONGO_URI from .env, exits process if it fails

  const server = app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });

  // close DB connection cleanly when Render restarts/stops the service
  process.on("SIGINT", gracefulShutdown());
  process.on("SIGTERM", gracefulShutdown());
}

startServer();
