import { AIMode } from "../types";

export async function generateAIResponse(prompt: string, mode: AIMode, history: { role: string; parts: { text: string }[] }[] = []) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: prompt,
        history: history
      })
    });

    if (!response.ok) {
      console.error("Backend API Error");
      return "AI error";
    }

    const data = await response.json();
    let output = data.reply;

    if (output && typeof output !== 'string') {
      if (Array.isArray(output)) {
        output = output.map((item: any) => item.text || item.content || JSON.stringify(item)).join('\n');
      } else {
        output = output.text || output.content || JSON.stringify(output);
      }
    }

    return output || "AI error";
  } catch (error) {
    console.error("API Error:", error);
    return "AI error";
  }
}

export async function* streamAIResponse(prompt: string, mode: AIMode, history: { role: string; parts: { text: string }[] }[] = []) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: prompt,
        history: history
      })
    });

    if (!response.ok) {
      console.error("Backend API Error");
      yield "AI error";
      return;
    }

    const data = await response.json();
    let output = data.reply;

    if (output && typeof output !== 'string') {
      if (Array.isArray(output)) {
        output = output.map((item: any) => item.text || item.content || JSON.stringify(item)).join('\n');
      } else {
        output = output.text || output.content || JSON.stringify(output);
      }
    }

    if (output && output !== "AI error") {
      // Simulate streaming for UI effect
      const words = String(output).split(' ');
      for (let i = 0; i < words.length; i++) {
        yield words[i] + (i < words.length - 1 ? ' ' : '');
        await new Promise(resolve => setTimeout(resolve, 20)); // small delay
      }
    } else {
      yield "AI error";
    }
  } catch (error) {
    console.error("API Error:", error);
    yield "AI error";
  }
}
