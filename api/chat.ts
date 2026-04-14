import { handleChat } from "../server/chat_logic.js";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

// Vercel will call this for /api/chat
app.all("/api/chat", handleChat);

export default app;
