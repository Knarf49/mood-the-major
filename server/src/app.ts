import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "../routes/auth.route";
import postRoutes from "../routes/post.route";
import { globalLimiter } from "../utils/rateLimiter";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL!,
    credentials: true, // required so the browser sends/receives the refresh cookie
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(globalLimiter); // baseline protection on every route

// mount routes here
app.get("/", (req, res) => res.send("hello, backend server is running"));

app.use("/", authRoutes);   // gives /signup, /login, /refresh, /logout, etc. (no /auth prefix)
app.use("/posts", postRoutes);

export default app;
