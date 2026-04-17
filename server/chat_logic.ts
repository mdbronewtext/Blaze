import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_PAT = process.env.GITHUB_PAT || process.env.GITHUB_GROK || GITHUB_TOKEN;
const endpoint = "https://models.github.ai/inference/chat/completions";

const FREE_MODELS = ["openai/gpt-4.1", "deepseek-r1", "grok-3"];

export async function handleChat(req: any, res: any) {
  try {
    const { message, history = [], module = 'chat', systemPrompt: customSystemPrompt, model = "openai/gpt-4.1" } = req.body;

    console.log(`[Chat Request] Model: ${model}, Module: ${module}`);
    // Only log message length for security/privacy if preferred, but user requested request body logging
    console.log(`[Chat Request] Body:`, JSON.stringify({ model, module, messageLength: message?.length }));

    // --- PRO CHECK ---
    const isFreeModel = FREE_MODELS.includes(model);
    if (!isFreeModel) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ error: "Access denied. Please log in and upgrade to Pro to use this model." });
      }
      const token = authHeader.split('Bearer ')[1];
      
      // We will parse the JWT payload to get the user_id (uid), but we don't fully verify the signature locally 
      // because the very next step is sending it to Google's server (Firestore) which will inherently verify it.
      let uid;
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('ascii'));
        uid = payload.user_id;
      } catch (e) {
        return res.status(401).json({ error: "Invalid auth token." });
      }

      if (uid) {
        let projectId = process.env.VITE_FIREBASE_PROJECT_ID;
        let databaseId = process.env.VITE_FIRESTORE_DATABASE_ID || "(default)";

        // Try reading from config file if env vars aren't set
        if (!projectId) {
          try {
            const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            projectId = config.projectId;
            databaseId = config.firestoreDatabaseId || "(default)";
          } catch (e) {
            console.error("Could not read firebase config for proxy access");
          }
        }

        if (projectId) {
          // Verify user plan via Firestore REST API securely
          const firestoreRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`, {
             headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!firestoreRes.ok) {
            return res.status(403).json({ error: "Permission denied or user not found." });
          }
          const userDoc = await firestoreRes.json();
          const userPlan = userDoc.fields?.plan?.stringValue || "FREE";
          const userRole = userDoc.fields?.role?.stringValue || "user";
          
          if (userPlan === "FREE" && userRole !== "owner") {
            return res.status(403).json({ error: "Pro tier required. Please upgrade your plan to access this model." });
          }
        }
      }
    }
    // --- END PRO CHECK ---

    let token = GITHUB_TOKEN || GITHUB_PAT;
    
    // Choose specific tokens if required by the model
    if (model === "deepseek-r1") {
      token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    } else if (model === "grok-3") {
      token = process.env.GITHUB_GROK || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    }

    if (!token) {
      return res.status(400).json({ 
        error: "GitHub authentication token is not configured. Please add GITHUB_GROK, GITHUB_PAT, or GITHUB_TOKEN to the AI Studio Secrets panel." 
      });
    }

    // Map frontend IDs to actual model identifiers
    let actualModel = model;
    if (model === "deepseek-r1") {
      actualModel = "deepseek/DeepSeek-R1";
    } else if (model === "grok-3") {
      actualModel = "xai/grok-3";
    } else if (model === "openai/gpt-4.1") {
      actualModel = "openai/gpt-4o"; 
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

    let responseText = "";

    if (FREE_MODELS.includes(model) || model.startsWith("openai/") || model === "deepseek-r1" || model === "grok-3") {
      const gitRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages,
          temperature: 1.0,
          top_p: 1.0,
          model: actualModel 
        })
      });

      const data = await gitRes.json();
      console.log(`[GitHub API Response] Status: ${gitRes.status}`);
      if (!gitRes.ok) {
        console.error(`[GitHub API Error] Details:`, JSON.stringify(data));
        throw data.error || new Error(data.message || "Unexpected GitHub Models API response");
      }
      responseText = data.choices[0].message.content;
      console.log(`[GitHub API Success] Response Length: ${responseText?.length}`);
    } else {
      const prompt = messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n");
      console.log(`[External API Request] Model: ${actualModel}`);
      const externalRes = await fetch(
        `https://shaikhs-ai.rajageminiwala.workers.dev/chat/get?prompt=${encodeURIComponent(prompt)}&model=${actualModel}`
      );
      if (!externalRes.ok) {
        console.error(`[External API Error] Status: ${externalRes.status}`);
        throw new Error("External API Error");
      }
      const data = await externalRes.json();
      responseText = data.response || "";
      console.log(`[External API Success] Response Length: ${responseText?.length}`);
    }

    res.json({ text: responseText });
  } catch (error: any) {
    console.error("GitHub Models Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
