import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import type { Request, Response } from "express";
import { isModelAllowed } from "./model_roles.js";

export async function handleGithubChat(req: Request, res: Response) {
  const token = process.env.GITHUB_TOKEN;
  
  const requestedModel = req.body.model || "openai/gpt-4.1";
  const userPlan = req.body.userPlan || "FREE";

  if (!isModelAllowed(requestedModel, userPlan)) {
    res.status(403).json({ error: "Access denied. Please upgrade to Pro to use this model." });
    return;
  }

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
        model: req.body.model || "openai/gpt-4.1",
        temperature: req.body.temperature || 1,
        top_p: req.body.top_p || 1,
        max_tokens: req.body.max_tokens || 4096
      }
    });

    // The user strictly wants openai/gpt-4.1 for now, let's ensure the status check is lenient
    // Some responses might return a string status "200" or number 200
    if (String(response.status) !== "200") {
      const errorBody = response.body as any;
      console.error("GitHub API Error Details:", errorBody);
      throw new Error(`Model API error: ${response.status} - ${errorBody?.error?.message || "Unknown error"}`);
    }

    const body = response.body as any;
    if (!body.choices || body.choices.length === 0) {
      throw new Error("Invalid response structure from GitHub API");
    }

    res.json({
      response: body.choices[0].message.content
    });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "GitHub API Error" });
  }
}
