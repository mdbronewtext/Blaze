import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function handleGeminiChat(req: any, res: any) {
  try {
    const { message, history = [], systemPrompt } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not configured in environment variables." 
      });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // We use gemini-3-flash-preview as the default latest working model
    const model = "gemini-3-flash-preview";

    // Convert history to Gemini format if needed, but for simplicity we'll just use generateContent
    // If you need full chat history, you'd use ai.chats.create
    
    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.parts?.[0]?.text || h.content || "" }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemPrompt || "You are Blaze AI, a helpful assistant.",
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      }
    });

    const text = response.text || "I'm sorry, I couldn't generate a response.";

    return res.json({ text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ 
      error: error.message || "An unexpected error occurred during AI generation." 
    });
  }
}
