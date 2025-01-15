import * as vscode from 'vscode';

/**
 * Retrieves the INI folder path from the extension settings or prompts the user to set it.
 */
export async function getIniFolderPath(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('tgaPreview');
    let iniFolderPath = config.get<string>('iniFolderPath');

    if (!iniFolderPath) {
        iniFolderPath = await promptForIniFolderPath();
    }

    return iniFolderPath;
}

/**
 * Prompts the user to set the INI folder path and saves it in the settings.
 */
export async function promptForIniFolderPath(): Promise<string | undefined> {
    const iniFolderPath = await vscode.window.showInputBox({
        prompt: 'Enter the folder path containing INI files',
        placeHolder: '/path/to/ini/files',
    });

    if (iniFolderPath) {
        const config = vscode.workspace.getConfiguration('tgaPreview');
        await config.update('iniFolderPath', iniFolderPath, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`INI folder path set to: ${iniFolderPath}`);
    }

    return iniFolderPath;
}

export function registerUpdateIniPathFeature(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('tga.updateIniFolderPath', async () => {
            await promptForIniFolderPath();
        })
    );
}