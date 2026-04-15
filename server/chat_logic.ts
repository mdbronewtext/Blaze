import { GoogleGenAI } from "@google/genai";

export async function handleChat(req: any, res: any) {
    const { message, attachment, history = [], settings = {} } = req.body;
    const { aiMode = 'smart', responseStyle = 'detailed' } = settings;

    if (!message && !attachment) {
      return res.status(400).json({ error: "Message or attachment is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "YOUR_API_KEY") {
      return res.json({ text: "⚠️ **API Key Missing or Invalid**: Please configure a valid `GEMINI_API_KEY` in the application settings (Secrets/Environment Variables)." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Format history for Gemini
      const formattedHistory = history.map((h: any) => ({
        role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.parts?.[0]?.text || h.content || h.message || "" }]
      }));

      let promptText = message;
      if (attachment && attachment.extractedText) {
        promptText = `[Attached File: ${attachment.name}]\n\n${attachment.extractedText}\n\n${message}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          ...formattedHistory,
          { role: 'user', parts: [{ text: promptText }] }
        ],
        config: {
          systemInstruction: `You are BLAZE-AI, a high-performance, intelligent assistant. 
          Mode: ${aiMode}
          Style: ${responseStyle}
          Provide clear, accurate, and helpful responses. Keep it professional yet engaging.`,
          temperature: 0.7,
        }
      });

      const text = response.text || "I'm sorry, I couldn't generate a response.";
      return res.status(200).json({ text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({ 
        error: "AI Service Error", 
        details: error.message || "Unknown error" 
      });
    }
}
