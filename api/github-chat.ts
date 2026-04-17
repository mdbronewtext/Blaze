import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return res.status(500).json({ error: "Missing API Key" });
    }

    const client = ModelClient(
      "https://models.github.io/inference", // Note: The user had models.github.ai, but check if they meant .ai or .io. Actually user snippet said .ai
      new AzureKeyCredential(token)
    );
    
    // Using .ai as per user snippet
    const client_ai = ModelClient(
      "https://models.github.ai/inference",
      new AzureKeyCredential(token)
    );

    const response = await client_ai.path("/chat/completions").post({
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

    if (String(response.status) !== "200") {
        throw new Error(`GitHub API returned status ${response.status}`);
    }

    res.status(200).json({
      response: (response.body as any).choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "GitHub API Error" });
  }
}
