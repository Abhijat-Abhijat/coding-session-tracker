"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
let startTime = Date.now();
let extensionContext;
function activate(context) {
    extensionContext = context;
    startTime = Date.now();
    // Register sidebar view
    vscode.window.registerWebviewViewProvider('codingTrackerView', new CodingTrackerViewProvider(context));
    // Register command
    context.subscriptions.push(vscode.commands.registerCommand('coding-session-tracker.showTime', () => {
        const total = context.globalState.get('totalTime', 0);
        vscode.window.showInformationMessage(`You coded for ${Math.floor(total / 60)} minutes`);
    }));
}
function deactivate() {
    const endTime = Date.now();
    const seconds = Math.floor((endTime - startTime) / 1000);
    const previous = extensionContext.globalState.get('totalTime', 0);
    extensionContext.globalState.update('totalTime', previous + seconds);
}
class CodingTrackerViewProvider {
    context;
    constructor(context) {
        this.context = context;
    }
    resolveWebviewView(webviewView) {
        const totalSeconds = this.context.globalState.get('totalTime', 0);
        webviewView.webview.options = {
            enableScripts: false
        };
        webviewView.webview.html = `
            <!DOCTYPE html>
            <html>
            <body style="font-family: sans-serif; padding: 12px;">
                <h2>⏱ Coding Time</h2>
                <p>Total time spent coding:</p>
                <h1>${Math.floor(totalSeconds / 60)} minutes</h1>
            </body>
            </html>
        `;
    }
}
//# sourceMappingURL=extension.js.map