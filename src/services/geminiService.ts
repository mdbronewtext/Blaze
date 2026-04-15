import { AIMode } from "../types";

export async function generateAIResponse(prompt: string, mode: AIMode, history: { role: string; parts: { text: string }[] }[] = []) {
  try {
    const response = await fetch('/api/ai', {
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
      const errorData = await response.json().catch(() => ({}));
      console.error("Backend API Error:", errorData.error);
      return "AI error: " + (errorData.error || "Unknown error");
    }

    const data = await response.json();
    return data.text || "AI error: Empty response";
  } catch (error) {
    console.error("API Error:", error);
    return "AI error";
  }
}

export async function* streamAIResponse(prompt: string, mode: AIMode, history: { role: string; parts: { text: string }[] }[] = []) {
  try {
    const response = await fetch('/api/ai', {
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
      const errorData = await response.json().catch(() => ({}));
      console.error("Backend API Error:", errorData.error);
      yield "AI error: " + (errorData.error || "Unknown error");
      return;
    }

    const data = await response.json();
    const output = data.text;

    if (output) {
      // Simulate streaming for UI effect as requested for "clean JSON response"
      const words = String(output).split(' ');
      for (let i = 0; i < words.length; i++) {
        yield words[i] + (i < words.length - 1 ? ' ' : '');
        await new Promise(resolve => setTimeout(resolve, 15)); // slightly faster typing
      }
    } else {
      yield "AI error: Empty response";
    }
  } catch (error) {
    console.error("API Error:", error);
    yield "AI error";
  }
}
