import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { isModelAllowed } from "../../server/model_roles.js";

export default async function handler(req, res) {
  try {
    const token = process.env.GITHUB_TOKEN;

    const requestedModel = req.body.model || "openai/gpt-4.1";
    const userPlan = req.body.userPlan || "FREE";

    if (!isModelAllowed(requestedModel, userPlan)) {
      return res.status(403).json({ error: "Access denied. Please upgrade to Pro to use this model." });
    }

    if (!token) {
      return res.status(500).json({ error: "Missing API Key" });
    }

    const client = ModelClient(
      "https://models.github.ai/inference",
      new AzureKeyCredential(token)
    );

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

    res.status(200).json({
      response: response.body.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "GitHub API Error" });
  }
}
