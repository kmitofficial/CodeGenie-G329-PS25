import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      console.log("🆕 Active editor changed.");
      savedEditor = editor;
    }
  });
  let savedEditor: vscode.TextEditor | undefined;
  let lastGeneratedCode = ""; 

  let disposable = vscode.commands.registerCommand('codegeniesam.generateCode', () => {
    savedEditor = vscode.window.activeTextEditor;

    if (!savedEditor) {
      vscode.window.showInformationMessage('Please open and focus a file to use CodeGenie.');
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codeGenieSuggestions',
      'CodeGenie AI Suggestions',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );
    panel.reveal(vscode.ViewColumn.Beside, true);
    panel.webview.html = getWebviewContent(panel, context.extensionUri);


    panel.webview.onDidReceiveMessage(async (message) => {
      if (!savedEditor) {
        panel.webview.postMessage({ command: 'error', text: 'No active editor detected.' });
        return;
      }
      const selection = savedEditor.selection;

      if (message.command === 'fetchSuggestion') {
        const contextText = savedEditor.document.getText(selection);
        if (!contextText || contextText.trim() === "") {
          vscode.window.showInformationMessage("Please select some prompt.");
          return;
        }

        const prompt = `${contextText} \n Provide only the correct code within brackticks. Do not provide explanations.`;
        // const prompt = `${contextText} \n Kindly debug the code, if there is any syntactical or logical issues, provide the correct code`;
        console.log(prompt);
        try {
          const response = await axios.post("http://localhost:8000/generate", {
            prompt,
            max_new_tokens: 500 // You can make this dynamic if needed
          });
          function extractCodeBlock(text: string): string {
            const tripleBacktickMatch = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
            if (tripleBacktickMatch) {
              return tripleBacktickMatch[1].trim();
            }
            const singleBacktickMatch = text.match(/`([^`]+)`/);
            if (singleBacktickMatch) {
              return singleBacktickMatch[1].trim();
            }
        
            return text.trim(); // Use the full response if no backticks
          }
        
          lastGeneratedCode = extractCodeBlock(response.data.completion);
          // lastGeneratedCode = response.data.completion;
          console.log("🚀 Suggested output from model:", lastGeneratedCode);

          panel.webview.postMessage({ command: 'showSuggestion', suggestion: lastGeneratedCode });
        } catch (error) {
          panel.webview.postMessage({ command: 'error', text: 'Failed to fetch suggestion.' });
          console.error(error);
        }
      }else if (message.command === 'debug') {
        const contextText = savedEditor.document.getText(savedEditor.selection);
        if (!contextText || contextText.trim() === "") {
          vscode.window.showInformationMessage("Please select some code to debug.");
          return;
        }
      
     