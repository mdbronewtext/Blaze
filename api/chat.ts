import { handleChat } from "../server/chat_logic";

// Increase max execution time on Vercel to prevent 504 Gateway Timeouts during AI generation
// 60 is the maximum allowed on Vercel Hobby plan
export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    return await handleChat(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}
