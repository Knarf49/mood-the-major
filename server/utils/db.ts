import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(uri: string = process.env.MONGO_URI!) {
  if (isConnected) return mongoose.connection;

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log("[db] MongoDB connected");
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err);
    // fail fast on boot rather than running with no DB
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("[db] MongoDB disconnected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB error:", err);
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  isConnected = false;
}

// call in server.ts: process.on("SIGINT", gracefulShutdown); process.on("SIGTERM", gracefulShutdown);
export function gracefulShutdown() {
  return async () => {
    await disconnectDB();
    console.log("[db] MongoDB connection closed, exiting");
    process.exit(0);
  };
}
