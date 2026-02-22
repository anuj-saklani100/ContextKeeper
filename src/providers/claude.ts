import Anthropic from "@anthropic-ai/sdk";
import { Config } from "../config";
import { BaseProvider, Message } from "./base";

export class ClaudeProvider extends BaseProvider {
  readonly name = "claude";
  readonly models = [
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
  ];
  async chat(model: string, messages: Message[], system: string): Promise<string> {
    const client = new Anthropic({ apiKey: Config.anthropicKey });
    const res = await client.messages.create({
      model, max_tokens: 2048,
      system: system || "You are a helpful assistant.",
      messages,
    });
    return (res.content[0] as { text: string }).text;
  }
}
