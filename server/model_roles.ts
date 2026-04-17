export const ROLE_MODELS = [
  { id: "kyvex", name: "Kyvex", description: "Fast & Smart", icon: "⚡", type: "api", requiredRole: "pro", enabled: true },
  { id: "claude-sonnet-4.5", name: "Claude-sonnet-4.5", description: "Advanced Intelligence", icon: "🧠", type: "api", requiredRole: "pro", enabled: true },
  { id: "gpt-5", name: "GPT-5", description: "Multi AI", icon: "🤖", type: "api", requiredRole: "pro", enabled: true },
  { id: "gemini-2.5-pro", name: "Gemini-2.5-pro", description: "Multi AI", icon: "✨", type: "api", requiredRole: "pro", enabled: true },
  { id: "grok-4", name: "Grok 4", description: "Multi AI", icon: "⚡", type: "api", requiredRole: "pro", enabled: true },
  { id: "gemini-imagen-4", name: "Gemini-imagen-4", description: "Multi AI", icon: "🎨", type: "api", requiredRole: "pro", enabled: true },
  { id: "openai/gpt-4.1", name: "GPT-4.1", description: "GitHub AI", icon: "💬", type: "github", requiredRole: "free", enabled: true },
  { id: "xai/grok-3", name: "Grok 3", description: "GitHub AI", icon: "🌌", type: "github", requiredRole: "free", enabled: true },
  { id: "deepseek/DeepSeek-R1", name: "DeepSeek-R1", description: "Deep Reasoning", icon: "🐳", type: "github", requiredRole: "free", enabled: true }
];

export function getModelsByRole(plan: string) {
  const isFree = !plan || plan === 'FREE';
  return ROLE_MODELS.filter(m => !isFree || m.requiredRole === 'free');
}

export function isModelAllowed(modelId: string, plan: string) {
  const isFree = !plan || plan === 'FREE';
  const model = ROLE_MODELS.find(m => m.id === modelId);
  if (!model) return false;
  if (isFree && model.requiredRole !== 'free') return false;
  return true;
}
