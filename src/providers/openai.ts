import OpenAI from "openai";
import { Config } from "../config";
import { BaseProvider, Message } from "./base";

export class OpenAIProvider extends BaseProvider {
  readonly name = "openai";
  readonly models = ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o3-mini"];
  async chat(model: string, messages: Message[], system: string): Promise<string> {
    const client = new OpenAI({ apiKey: Config.openaiKey });
    const all = system
      ? [{ role: "system" as const, content: system }, ...messages]
      : messages;
    const res = await client.chat.completions.create({ model, messages: all });
    return res.choices[0].message.content ?? "";
  }
}
