import { BaseProvider } from "./base";
import { ClaudeProvider } from "./claude";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";

const providers: BaseProvider[] = [
  new ClaudeProvider(),
  new OpenAIProvider(),
  new GeminiProvider(),
  new OllamaProvider(),
];

export function detectProvider(model: string): BaseProvider {
  for (const p of providers) if (p.models.includes(model)) return p;
  const m = model.toLowerCase();
  if (m.includes("claude"))              return providers[0];
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3")) return providers[1];
  if (m.includes("gemini"))              return providers[2];
  return providers[3];
}

export function allModels(): Record<string, string[]> {
  return Object.fromEntries(providers.map(p => [p.name, p.models]));
}
