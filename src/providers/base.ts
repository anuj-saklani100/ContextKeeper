export interface Message { role: "user" | "assistant"; content: string; }

export abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly models: string[];
  abstract chat(model: string, messages: Message[], system: string): Promise<string>;
}
