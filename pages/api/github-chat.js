import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

export default async function handler(req, res) {
  try {
    const token = process.env.GITHUB_TOKEN;

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
        temperature: 1,
        top_p: 1
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
