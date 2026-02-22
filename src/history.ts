import * as fs from "fs";
import * as path from "path";
import { Config } from "./config";

export interface Message { role: "user" | "assistant"; content: string; }

export interface SessionMeta {
  id: string;
  model: string;
  turns: number;
  updatedAt: string;
  summary: string;
}

export class HistoryManager {
  readonly filepath: string;
  messages: Message[] = [];
  summary = "";

  constructor(readonly sessionId: string) {
    this.filepath = path.join(Config.historyDir, `${sessionId}.md`);
    this.load();
  }

  private load() {
    if (!fs.existsSync(this.filepath)) return;
    let raw = fs.readFileSync(this.filepath, "utf8");
    const sumMatch = raw.match(/^<!-- SUMMARY\n([\s\S]*?)\n-->/);
    if (sumMatch) { this.summary = sumMatch[1]; raw = raw.slice(sumMatch[0].length).trim(); }
    for (const block of raw.split("\n---\n")) {
      const t = block.trim();
      if (t.startsWith("## USER"))
        this.messages.push({ role: "user", content: t.slice(7).trim() });
      else if (t.startsWith("## ASSISTANT"))
        this.messages.push({ role: "assistant", content: t.slice(12).trim() });
    }
  }

  saveTurn(role: "user" | "assistant", content: string) {
    this.messages.push({ role, content });
    const label = role === "user" ? "USER" : "ASSISTANT";
    fs.appendFileSync(this.filepath, `\n## ${label}\n${content}\n\n---\n`);
  }

  replaceWithSummary(summary: string, keepLast = 6) {
    this.summary = summary;
    this.messages = this.messages.slice(-keepLast);
    const lines = [`<!-- SUMMARY\n${summary}\n-->\n`];
    for (const m of this.messages)
      lines.push(`\n## ${m.role === "user" ? "USER" : "ASSISTANT"}\n${m.content}\n\n---\n`);
    fs.writeFileSync(this.filepath, lines.join(""));
  }

  buildContext(selected?: SessionMeta[]): string {
    const parts = [
      "You are resuming a conversation. Prior context is below.",
      "Use it to understand what the user was working on and continue naturally.\n",
    ];
    if (selected?.length) {
      parts.push("## Context from other sessions\n");
      for (const s of selected) {
        const h = new HistoryManager(s.id);
        if (h.summary) parts.push(`### ${s.id} (summary)\n${h.summary}\n`);
        for (const m of h.messages.slice(-6))
          parts.push(`**${m.role === "user" ? "User" : "Assistant"}:** ${m.content}`);
        parts.push("");
      }
    }
    if (this.summary) parts.push(`## Summary of earlier conversation\n${this.summary}\n`);
    if (this.messages.length) {
      parts.push("## Recent messages");
      for (const m of this.messages)
        parts.push(`**${m.role === "user" ? "User" : "Assistant"}:** ${m.content}`);
    }
    parts.push("\nContinue from where this left off.");
    return parts.join("\n");
  }

  clear() {
    this.messages = []; this.summary = "";
    if (fs.existsSync(this.filepath)) fs.unlinkSync(this.filepath);
  }

  get turnCount() { return Math.floor(this.messages.length / 2); }
}

export function listSessions(): SessionMeta[] {
  const dir = Config.historyDir;
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".meta.json"))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as SessionMeta; }
      catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => b!.updatedAt.localeCompare(a!.updatedAt)) as SessionMeta[];
}

export function saveSessionMeta(meta: SessionMeta) {
  fs.writeFileSync(
    path.join(Config.historyDir, `${meta.id}.meta.json`),
    JSON.stringify(meta, null, 2)
  );
}

export function deleteSession(id: string) {
  [".md", ".meta.json"].forEach(ext => {
    const p = path.join(Config.historyDir, `${id}${ext}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
}
