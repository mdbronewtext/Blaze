import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { Request, Response } from "express";

export async function handleGithubChat(req: Request, res: Response) {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    res.status(500).json({ error: "GITHUB_TOKEN environment variable is missing" });
    return;
  }

  const client = ModelClient(
    "https://models.github.ai/inference",
    new AzureKeyCredential(token)
  );

  try {
    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: req.body.message }
        ],
        model: "openai/gpt-4.1"
      }
    });

    if (response.status !== "200") {
      throw new Error(`Model API error: ${response.status}`);
    }

    res.json({
      response: (response.body as any).choices[0].message.content
    });

  } catch (e: any) {
    console.error("Github AI Error", e);
    res.status(500).json({ error: "API Error" });
  }
}
