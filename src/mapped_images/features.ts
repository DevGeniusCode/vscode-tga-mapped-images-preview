import * as vscode from 'vscode';
import * as path from 'path';
import { getMappedImages } from './getMappedImages';

export function registerToolbarFeature(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('tga.showToolbar', async (uri: vscode.Uri) => {
            // Open a new WebView for the toolbar
            const panel = vscode.window.createWebviewPanel(
                'tgaToolbar',
                'TGA Toolbar',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(context.extensionPath)],
                }
            );

            // Scan the INI files
            const folderPath = path.dirname(uri.fsPath);
            const { texturesFilesMappedImagesDictionary } = getMappedImages(folderPath);

            // Create HTML for the WebView
            const html = generateToolbarHtml(texturesFilesMappedImagesDictionary, panel.webview);

            panel.webview.html = html;

            // Listen for messages from the WebView
            panel.webview.onDidReceiveMessage(message => {
                switch (message.command) {
                    case 'updateCoordinates':
                        vscode.window.showInformationMessage(`Updated coordinates: ${message.data}`);
                        break;
                }
            });
        })
    );
}

function generateToolbarHtml(
    texturesFilesMappedImagesDictionary: Record<string, string[]>,
    webview: vscode.Webview
): string {
    const textureOptions = Object.keys(texturesFilesMappedImagesDictionary)
        .map(
            texture =>
                `<option value="${texture}">${texture} (${texturesFilesMappedImagesDictionary[texture].length} images)</option>`
        )
        .join('\n');

    return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>TGA Toolbar</title>
            <script>
                const vscode = acquireVsCodeApi();

                function updateCoordinates() {
                    const texture = document.getElementById('textureSelect').value;
                    const coordinates = document.getElementById('coordinates').value;

                    vscode.postMessage({
                        command: 'updateCoordinates',
                        data: { texture, coordinates },
                    });
                }
            </script>
        </head>
        <body>
            <h3>TGA Toolbar</h3>
            <label for="textureSelect">Select Texture:</label>
            <select id="textureSelect" onchange="updateCoordinates()">
                ${textureOptions}
            </select>
            <br><br>
            <label for="coordinates">Coordinates:</label>
            <input id="coordinates" type="text" placeholder="Enter coordinates (Left, Top, Right, Bottom)" />
            <button onclick="updateCoordinates()">Update</button>
        </body>
        </html>
    `;
}
