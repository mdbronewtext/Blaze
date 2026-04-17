import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";
import { isModelAllowed } from "./model_roles.js";

dotenv.config();

const token = process.env.GITHUB_TOKEN;
const endpoint = "https://models.github.ai/inference";

export async function handleChat(req: any, res: any) {
  try {
    const { message, history = [], module = 'chat', systemPrompt: customSystemPrompt, model = "openai/gpt-4.1", userPlan = "FREE" } = req.body;

    if (!isModelAllowed(model, userPlan)) {
      return res.status(403).json({ error: "Access denied. Please upgrade to Pro to use this model." });
    }

    if (!token) {
      return res.status(400).json({ 
        error: "GITHUB_TOKEN is not configured. Please add it to the AI Studio Secrets panel." 
      });
    }

    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    let systemPrompt = customSystemPrompt || "You are a helpful assistant.";
    
    if (!customSystemPrompt) {
      if (module === 'code') {
        systemPrompt = "You are an expert programmer. Always give clean, optimized, production-ready code.";
      } else if (module === 'research') {
        systemPrompt = "You are a deep research AI. Provide detailed, structured, and accurate answers.";
      } else if (module === 'image') {
        systemPrompt = "You are a Vision AI. You can analyze images. (Note: Image analysis is currently being integrated, please describe the image if you have one).";
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h: any) => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts?.[0]?.text || h.content || ""
      })),
      { role: "user", content: message }
    ];

    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        temperature: 1.0,
        top_p: 1.0,
        model: model 
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const responseText = response.body.choices[0].message.content;
    res.json({ text: responseText });
  } catch (error: any) {
    console.error("GitHub Models Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
