import * as vscode from "vscode";
import { Config } from "../config";

export class ModelStatusBar {
  private item: vscode.StatusBarItem;
  currentModel: string;

  constructor(ctx: vscode.ExtensionContext) {
    this.currentModel = Config.defaultModel;
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = "contextkeeper.switchModel";
    this.item.tooltip = "ContextKeeper — click to switch model";
    ctx.subscriptions.push(this.item);
    this.refresh();
  }

  show()   { this.item.show(); }
  dispose(){ this.item.dispose(); }

  setModel(model: string) { this.currentModel = model; this.refresh(); }

  private refresh() { this.item.text = `$(hubot) ${this.currentModel}`; }
}
