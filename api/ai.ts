import { handleChat } from "../server/chat_logic";

export const maxDuration = 60;

export default function handler(req: any, res: any) {
  if (req.method === 'POST') {
    return handleChat(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}
