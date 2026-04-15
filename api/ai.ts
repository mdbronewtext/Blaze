import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [], settings = {} } = req.body;
  const prompt = message;

  if (!prompt) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "YOUR_API_KEY") {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing or invalid. Please configure it in your environment settings.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Format history for Gemini
    // Gemini expects { role: 'user' | 'model', parts: [{ text: string }] }
    const formattedHistory = history.map((h: any) => ({
      role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.parts?.[0]?.text || h.content || "" }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: "You are BLAZE-AI, a high-performance, intelligent assistant. Provide clear, accurate, and helpful responses. Keep it professional yet engaging.",
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      }
    });

    const text = response.text || "I'm sorry, I couldn't generate a response.";
    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ 
      error: 'AI Service Error', 
      details: error.message || 'Unknown error' 
    });
  }
}
