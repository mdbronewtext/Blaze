import OpenAI from "openai";

export async function handleChat(req: any, res: any) {
    const { message, attachment, history = [], model = 'auto', memories = [], settings = {} } = req.body;
    const { aiMode = 'smart', responseStyle = 'detailed', apiKey: userApiKey = '' } = settings;

    if (!message && !attachment) {
      return res.status(400).json({ error: "Message or attachment is required" });
    }

    const token = userApiKey || process.env.GITHUB_TOKEN;

    if (!token || token === "YOUR_GITHUB_TOKEN") {
      return res.json({ reply: "⚠️ **API Key Missing**: Please add your API Key to the **Integrations** panel in Settings to enable AI features." });
    }

    // Intent Detection for Auto Mode
    let targetModel = model;
    if (model === 'auto') {
        if (aiMode === 'fast') {
          targetModel = 'gpt4o';
        } else if (aiMode === 'pro') {
          targetModel = 'deepseek';
        } else {
          const lowerMsg = (message || "").toLowerCase();
          if (lowerMsg.includes('code') || lowerMsg.includes('error') || lowerMsg.includes('bug') || lowerMsg.includes('fix')) {
            targetModel = 'claude';
          } else if (lowerMsg.includes('reason') || lowerMsg.includes('think') || lowerMsg.includes('complex') || lowerMsg.includes('math')) {
            targetModel = 'deepseek';
          } else if (lowerMsg.includes('grok') || lowerMsg.includes('xai') || lowerMsg.includes('fun') || lowerMsg.includes('roast')) {
            targetModel = 'grok';
          } else if (lowerMsg.includes('vision') || lowerMsg.includes('image') || lowerMsg.includes('describe') || lowerMsg.includes('see')) {
            targetModel = 'llama';
          } else if (lowerMsg.includes('fast') || lowerMsg.includes('speed') || lowerMsg.includes('quick') || lowerMsg.includes('instant')) {
            targetModel = 'gpt4o';
          } else {
            targetModel = 'gpt4o';
          }
        }
      }

    // Model Config
    const modelConfig = {
      claude: {
        id: "gpt-4o", // Fallback since Claude is not on GitHub Models
        system: "You are an expert programmer and problem solver. Provide precise, efficient, and well-documented code solutions."
      },
      gpt4o: {
        id: "gpt-4o",
        system: "You are a creative and helpful assistant. Provide engaging, imaginative, and useful responses."
      },
      deepseek: {
        id: "DeepSeek-R1",
        system: "You are DeepSeek-R1, a powerful reasoning model. Provide deep, logical, and well-structured answers."
      },
      grok: {
        id: "grok-3",
        system: "You are Grok-3, a witty and sharp AI assistant by xAI. Provide insightful, direct, and slightly edgy responses."
      },
      llama: {
        id: "Llama-3.2-11B-Vision-Instruct",
        system: "You are Llama 3.2 Vision, a powerful multimodal assistant by Meta. You excel at understanding both text and visual information."
      }
    };

    const selected = modelConfig[targetModel as 'claude' | 'gpt4o' | 'deepseek' | 'grok' | 'llama'] || modelConfig.gpt4o;

    try {
      // Memory Injection
      let systemPrompt = selected.system;
      
      // Apply Response Style
      if (responseStyle === 'short') {
        systemPrompt += "\n\n[RESPONSE STYLE: SHORT]\nProvide extremely concise, brief, and to-the-point answers. No fluff.";
      } else if (responseStyle === 'step-by-step') {
        systemPrompt += "\n\n[RESPONSE STYLE: STEP-BY-STEP]\nBreak down your response into clear, numbered steps or a logical sequence.";
      } else {
        systemPrompt += "\n\n[RESPONSE STYLE: DETAILED]\nProvide comprehensive, thorough, and well-explained answers.";
      }

      if (memories && memories.length > 0) {
        const memoryContext = memories.map((m: any) => `- ${m.content}`).join('\n');
        systemPrompt += `\n\n[USER MEMORY/CONTEXT]\nThe following are facts, preferences, or instructions the user has shared in the past. Use this context to personalize your response:\n${memoryContext}`;
      }

      // Initialize client
      const client = new OpenAI({
        baseURL: "https://models.github.ai/inference",
        apiKey: token
      });

      const isO1 = selected.id.includes('o1-');

      // Format history for OpenAI
      let messages: any[] = [];
      
      let userMessageContent: any = message;
      if (attachment && attachment.type === 'image' && attachment.url) {
        // Force a vision-capable model if an image is provided and model is auto
        if (model === 'auto') {
          targetModel = 'llama';
        }
        userMessageContent = [
          { type: "text", text: message || "What is this?" },
          { type: "image_url", image_url: { url: attachment.url } }
        ];
      } else if (attachment && attachment.extractedText) {
        userMessageContent = `[Attached File: ${attachment.name}]\n\n${attachment.extractedText}\n\n${message}`;
      }

      if (isO1) {
        // o1 models don't support system role on GitHub Models
        if (history.length > 0) {
          const formattedHistory = history.map((msg: any) => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.parts[0].text
          }));
          formattedHistory[0].content = `[System Instruction]\n${systemPrompt}\n\n${formattedHistory[0].content}`;
          messages = [...formattedHistory, { role: "user", content: userMessageContent }];
        } else {
          messages = [
            { role: "user", content: `[System Instruction]\n${systemPrompt}\n\n${typeof userMessageContent === 'string' ? userMessageContent : JSON.stringify(userMessageContent)}` }
          ];
        }
      } else {
        messages = [
          { role: "system", content: systemPrompt },
          ...history.map((msg: any) => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.parts[0].text
          })),
          { role: "user", content: userMessageContent }
        ];
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send initial ping to prevent Vercel timeout
      res.write(`data: ${JSON.stringify({ text: "" })}\n\n`);

      const stream = await client.chat.completions.create({
        messages: messages as any,
        model: selected.id,
        stream: true,
        ...(isO1 ? {} : {
          temperature: 1,
          top_p: 1
        }),
        max_tokens: 4096
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("API Error:", error);
      
      if (error?.status === 401 || error?.message?.includes('401')) {
        return res.json({ 
          reply: "🛑 **Authentication Error (401)**: Your `GITHUB_TOKEN` is invalid or expired. Please check your token in the **Secrets** panel and ensure it has 'GitHub Models' access." 
        });
      }

      if (error?.status === 403 || error?.message?.includes('403')) {
        return res.json({ 
          reply: "🚫 **Permission Denied (403)**: Your `GITHUB_TOKEN` does not have permission to use this specific model. This often happens with restricted models or if you haven't authorized the 'GitHub Models' app. Try switching to **GPT-4o**." 
        });
      }

      if (error?.status === 404 || error?.message?.includes('404')) {
        return res.json({ 
          reply: `❌ **Model Not Found (404)**: The model \`${selected.id}\` is not available on the GitHub Models endpoint. Please try a different model.` 
        });
      }

      if (error?.status === 424 || error?.message?.includes('424')) {
        return res.json({ 
          reply: `⚠️ **Upstream Error (424)**: The AI provider is currently experiencing connection issues. Please try again in a few moments.` 
        });
      }

      res.json({ reply: "❌ **AI Error**: " + (error instanceof Error ? error.message : "Unknown error") });
    }
}
