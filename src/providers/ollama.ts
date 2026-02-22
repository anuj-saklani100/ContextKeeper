import { Config } from "../config";
import { BaseProvider, Message } from "./base";

export class OllamaProvider extends BaseProvider {
  readonly name = "local (ollama)";
  readonly models = ["llama3", "mistral", "phi3", "codellama"];
  async chat(model: string, messages: Message[], system: string): Promise<string> {
    const all = system ? [{ role: "system", content: system }, ...messages] : messages;
    const res = await fetch(`${Config.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: all, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
    return ((await res.json()) as { message: { content: string } }).message.content;
  }
}
