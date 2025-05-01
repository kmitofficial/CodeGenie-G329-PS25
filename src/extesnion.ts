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

  let disposable = vscode.commands.registerCommand('codegenie.generate', () => {
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
      
       
        // const debugPrompt = `${contextText} \n Kindly debug the code. If there are any syntactical or logical issues, provide the corrected code only without explanations.`;
        // const debugPrompt = `Here is a buggy code snippet:\n${contextText}\n\nFix any logical or syntactic issues in the code and return the corrected code only. Do not validate or assume the logic is intentional. Do not explain anything. Just return fixed code.`;
        const debugPrompt = `You are a professional debugging assistant. Analyze the given Java code for both **syntax errors** and **logical errors**.
If any operator is misused (like using = instead of ==) or any logic is incorrect (e.g., using %3 to check for even numbers), fix it.
Clearly understand the intent of the code (like checking if a number is even) and return the corrected code **only**.

Here is the buggy code:\n\n${contextText}`;

        console.log(debugPrompt);
      
        try {
          const response = await axios.post("http://localhost:8000/generate", {
            prompt: debugPrompt,
            max_new_tokens: 500
          });
      
          lastGeneratedCode = response.data.completion;
          console.log("🐞 Debugged output from model:", lastGeneratedCode);
      
          panel.webview.postMessage({ command: 'showSuggestion', suggestion: lastGeneratedCode });
        } catch (error) {
          panel.webview.postMessage({ command: 'error', text: 'Failed to debug code.' });
          console.error(error);
        }
      }
      else if (message.command === 'explain') {
        const contextText = savedEditor.document.getText(savedEditor.selection);
        if (!contextText || contextText.trim() === "") {
          vscode.window.showInformationMessage("Please select some code to explain.");
          return;
        }
        const explainCode = `You are a professional code assistant. Analyze the given code, and Explain to the given code in crystal clear and simple way.
Here is the code:\n\n${contextText}`;

        console.log(explainCode);
      
        try {
          const response = await axios.post("http://localhost:8000/generate", {
            prompt: explainCode,
            max_new_tokens: 500
          });
      
          lastGeneratedCode = response.data.completion;
          console.log("🐞 Explanation output from model:", lastGeneratedCode);
      
          panel.webview.postMessage({ command: 'showSuggestion', suggestion: lastGeneratedCode });
        } catch (error) {
          panel.webview.postMessage({ command: 'error', text: 'Failed to explain the code.' });
          console.error(error);
        }
      }
      else if (message.command === 'insertCode') {
        if (!lastGeneratedCode || lastGeneratedCode.trim() === "") {
          vscode.window.showInformationMessage("No code suggestion to insert.");
          return;
        }

        await savedEditor.edit(editBuilder => {
          editBuilder.insert(selection.active, lastGeneratedCode.trim());
        });

        await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        panel.webview.postMessage({ command: 'showSuggestion', suggestion: 'Code inserted into editor.' });
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
function getWebviewContent(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): string {
  const htmlPath = vscode.Uri.joinPath(extensionUri, 'media', 'webview.html');
  const html = fs.readFileSync(htmlPath.fsPath, 'utf8');

  // Use webview-safe URIs for the CSS and JS files
  const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'styleMain.css'));
  const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));

  // Replace placeholders in the HTML with the correct URIs
  const updatedHtml = html
    .replace(/{{styleUri}}/g, styleUri.toString())
    .replace(/{{scriptUri}}/g, scriptUri.toString());

  return updatedHtml;
}