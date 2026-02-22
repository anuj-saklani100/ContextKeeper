import { GoogleGenerativeAI } from "@google/generative-ai";
import { Config } from "../config";
import { BaseProvider, Message } from "./base";

export class GeminiProvider extends BaseProvider {
  readonly name = "gemini";
  readonly models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"];
  async chat(model: string, messages: Message[], system: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(Config.googleKey);
    const gmodel = genAI.getGenerativeModel({
      model, systemInstruction: system || "You are a helpful assistant.",
    });
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
    const chatSession = gmodel.startChat({ history });
    const res = await chatSession.sendMessage(messages.at(-1)!.content);
    return res.response.text();
  }
}
