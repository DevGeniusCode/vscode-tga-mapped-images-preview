import * as vscode from 'vscode';
import {getMappedImages, MappedImageInfo} from './getMappedImages';
import { getIniFolderPath } from './ini_path';


export function registerToolbarFeature(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('tga.showToolbar', async () => {

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

            // get Ini Folder Path
            const iniFolderPath = await getIniFolderPath();

            if (!iniFolderPath) {
                vscode.window.showErrorMessage('INI folder path is not set. Please set it to proceed.');
                return;
            }

            // Scan the INI files
            const { texturesFilesMappedImagesDictionary } = getMappedImages(iniFolderPath);

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
    texturesFilesMappedImagesDictionary: Record<string, MappedImageInfo[]>,
    webview: vscode.Webview
): string {
    // TODO omptimize this using texturesFilesMappedImagesDictionary[textureFile]
    const mappedImageOptions = Object.keys(texturesFilesMappedImagesDictionary)
        .map(
            mappedImage =>
                `<option value="${mappedImage}">${mappedImage} (${texturesFilesMappedImagesDictionary[mappedImage].length} images)</option>`
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
                    const mappedImage = document.getElementById('mappedImageSelect').value;
                    const coordinates = document.getElementById('coordinates').value;

                    vscode.postMessage({
                        command: 'updateCoordinates',
                        data: { mappedImage, coordinates },
                    });
                }
            </script>
        </head>
        <body>
            <h3>TGA Toolbar</h3>
            <label for="mappedImageSelect">Select Image:</label>
            <select id="mappedImageSelect" onchange="updateCoordinates()">
                ${mappedImageOptions}
            </select>
            <br><br>
            <label for="coordinates">Coordinates:</label>
            <input id="coordinates" type="text" placeholder="Enter coordinates (Left, Top, Right, Bottom)" />
            <button onclick="updateCoordinates()">Update</button>
        </body>
        </html>
    `;
}
