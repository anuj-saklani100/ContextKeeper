import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  HistoryManager, listSessions, saveSessionMeta,
  deleteSession, SessionMeta
} from "../history";
import { detectProvider, allModels } from "../providers/registry";
import { Config } from "../config";
import { ModelStatusBar } from "../statusbar/ModelSwitcher";

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private session!: HistoryManager;
  private sessionId = "default";

  constructor(
    private readonly extUri: vscode.Uri,
    private readonly statusBar: ModelStatusBar
  ) { this.loadSession("default"); }

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    view.webview.options = { enableScripts: true };
    try {
      view.webview.html = this.getHtml();
    } catch (e: any) {
      view.webview.html = `<html><body><p style="color:red;padding:16px;">Failed to load chat UI: ${e.message}</p></body></html>`;
      vscode.window.showErrorMessage(`ContextKeeper: ${e.message}`);
      return;
    }

    view.webview.onDidReceiveMessage(async msg => {
      switch (msg.type) {
        case "ready":         this.pushSessions(); this.pushHistory(); break;
        case "chat":          await this.handleChat(msg.text); break;
        case "newSession":    await this.promptNewSession(); break;
        case "switchModel":   await this.promptSwitchModel(); break;
        case "selectSession": this.loadSession(msg.id); this.pushHistory(); break;
        case "deleteSession": deleteSession(msg.id); this.pushSessions(); break;
      }
    });
  }

  private loadSession(id: string) {
    this.sessionId = id;
    this.session = new HistoryManager(id);
  }

  async promptNewSession() {
    const id = await vscode.window.showInputBox({
      prompt: "Session name", value: `session-${Date.now()}`,
    });
    if (!id) return;
    this.loadSession(id);
    saveSessionMeta({ id, model: this.statusBar.currentModel,
      turns: 0, updatedAt: new Date().toISOString(), summary: "" });
    this.pushSessions(); this.pushHistory();
  }

  async promptSwitchModel() {
    const models = allModels();
    const items: vscode.QuickPickItem[] = [];
    for (const [provider, list] of Object.entries(models)) {
      items.push({ label: provider.toUpperCase(), kind: vscode.QuickPickItemKind.Separator });
      list.forEach(m => items.push({ label: m }));
    }
    const picked = await vscode.window.showQuickPick(items, {
      title: "Switch Model", placeHolder: `Current: ${this.statusBar.currentModel}`,
    });
    if (!picked || picked.kind === vscode.QuickPickItemKind.Separator) return;

    // Context picker
    const sessions = listSessions().filter(s => s.id !== this.sessionId);
    let selectedCtx: SessionMeta[] = [];
    if (sessions.length > 0) {
      const ctxItems = sessions.map(s => ({
        label: s.id,
        description: `${s.turns} turns · ${s.model} · ${new Date(s.updatedAt).toLocaleDateString()}`,
        picked: false, meta: s,
      }));
      const chosen = await vscode.window.showQuickPick(ctxItems, {
        title: "Pick context to inject (optional — press Escape to skip)",
        canPickMany: true,
      });
      selectedCtx = chosen?.map(c => c.meta) ?? [];
    }

    this.statusBar.setModel(picked.label);
    this.post({
      type: "modelSwitched", model: picked.label,
      contextSessions: selectedCtx.map(s => s.id),
    });
    vscode.window.showInformationMessage(
      `Switched to ${picked.label}${selectedCtx.length
        ? ` + context from: ${selectedCtx.map(s => s.id).join(", ")}` : ""} ✓`
    );
  }

  private async handleChat(text: string) {
    const model = this.statusBar.currentModel;
    this.post({ type: "userMessage", text });
    this.post({ type: "thinking" });
    try {
      const system = this.session.buildContext();
      const provider = detectProvider(model);
      const reply = await provider.chat(model, [{ role: "user", content: text }], system);

      this.session.saveTurn("user", text);
      this.session.saveTurn("assistant", reply);

      if (this.session.turnCount >= Config.summarizeAfter) await this.summarize();

      saveSessionMeta({ id: this.sessionId, model, turns: this.session.turnCount,
        updatedAt: new Date().toISOString(), summary: this.session.summary });

      this.post({ type: "reply", text: reply, model, turns: this.session.turnCount });
      this.pushSessions();
    } catch (e: any) {
      this.post({ type: "error", text: e.message });
    }
  }

  private async summarize() {
    const provider = detectProvider(this.statusBar.currentModel);
    const transcript = this.session.messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const summary = await provider.chat(
      this.statusBar.currentModel,
      [{ role: "user", content:
        "Summarize this conversation. Preserve key decisions, code, and context:\n\n" + transcript }],
      "You are a precise technical summarizer. Be concise."
    );
    this.session.replaceWithSummary(summary);
  }

  prefill(text: string) { this.post({ type: "prefill", text }); }

  private pushSessions() { this.post({ type: "sessions", sessions: listSessions() }); }
  private pushHistory()  {
    this.post({ type: "history", messages: this.session.messages,
      summary: this.session.summary, sessionId: this.sessionId });
  }
  private post(msg: object) { this.view?.webview.postMessage(msg); }

  private getHtml(): string {
    // Try multiple locations: next to compiled JS (packaged), or in src/ (dev mode)
    const candidates = [
      path.join(this.extUri.fsPath, "src", "sidebar", "chat.html"),
      path.join(__dirname, "chat.html"),
      path.join(__dirname, "../../src/sidebar/chat.html"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    }
    throw new Error(`chat.html not found. Searched: ${candidates.join(", ")}`);
  }
}
