import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

function cfg() { return vscode.workspace.getConfiguration("contextkeeper"); }

export const Config = {
  get anthropicKey()   { return cfg().get<string>("anthropicApiKey", ""); },
  get openaiKey()      { return cfg().get<string>("openaiApiKey", ""); },
  get googleKey()      { return cfg().get<string>("googleApiKey", ""); },
  get ollamaUrl()      { return cfg().get<string>("ollamaUrl", "http://localhost:11434"); },
  get defaultModel()   { return cfg().get<string>("defaultModel", "gpt-4o"); },
  get summarizeAfter() { return cfg().get<number>("summarizeAfterTurns", 20); },

  get historyDir(): string {
    const dir = path.join(os.homedir(), ".contextkeeper");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  },
};
