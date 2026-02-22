import * as vscode from "vscode";
import { ChatPanelProvider } from "./sidebar/ChatPanel";
import { ModelStatusBar }    from "./statusbar/ModelSwitcher";

let statusBar: ModelStatusBar;
let chatProvider: ChatPanelProvider;

export function activate(ctx: vscode.ExtensionContext) {
  statusBar    = new ModelStatusBar(ctx);
  chatProvider = new ChatPanelProvider(ctx.extensionUri, statusBar);

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider("contextkeeper.chat", chatProvider)
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand("contextkeeper.newSession",  () => chatProvider.promptNewSession()),
    vscode.commands.registerCommand("contextkeeper.switchModel", () => chatProvider.promptSwitchModel()),
    vscode.commands.registerCommand("contextkeeper.explainCode", () => {
      const code = selectedText();
      if (code) chatProvider.prefill(`Explain this code:\n\`\`\`\n${code}\n\`\`\``);
    }),
    vscode.commands.registerCommand("contextkeeper.askCode", async () => {
      const code = selectedText();
      if (!code) return;
      const q = await vscode.window.showInputBox({ prompt: "What do you want to ask?" });
      if (q) chatProvider.prefill(`${q}\n\`\`\`\n${code}\n\`\`\``);
    })
  );

  statusBar.show();
}

export function deactivate() {}

function selectedText(): string | null {
  const ed = vscode.window.activeTextEditor;
  return ed ? ed.document.getText(ed.selection) || null : null;
}
