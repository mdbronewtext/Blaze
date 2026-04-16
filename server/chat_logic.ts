import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_PAT = process.env.GITHUB_PAT || GITHUB_TOKEN;
const endpoint = "https://models.github.ai/inference";

export async function handleChat(req: any, res: any) {
  try {
    const { message, history = [], module = 'chat', systemPrompt: customSystemPrompt, model = "openai/gpt-4.1" } = req.body;

    // Use GITHUB_PAT if it's deepseek-r1, otherwise GITHUB_TOKEN (or whichever is available)
    const token = model === "deepseek-r1" ? (process.env.GITHUB_PAT || process.env.GITHUB_TOKEN) : (process.env.GITHUB_TOKEN || process.env.GITHUB_PAT);

    if (!token) {
      return res.status(400).json({ 
        error: "GitHub authentication token is not configured. Please add GITHUB_PAT or GITHUB_TOKEN to the AI Studio Secrets panel." 
      });
    }

    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    // Map frontend IDs to actual model identifiers
    let actualModel = model;
    if (model === "deepseek-r1") {
      actualModel = "deepseek/DeepSeek-R1";
    }

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
        model: actualModel 
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
