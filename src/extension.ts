/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { BinarySizeStatusBarEntry } from './binarySizeStatusBarEntry';
import { PreviewManager } from './preview';
import { SizeStatusBarEntry } from './sizeStatusBarEntry';
import { ZoomStatusBarEntry } from './zoomStatusBarEntry';
import { registerToolbarFeature } from './mapped_images/features';
import { registerUpdateIniPathFeature } from './mapped_images/ini_path';


export function activate(context: vscode.ExtensionContext) {
	console.log("activate", context.extension.id);
	const sizeStatusBarEntry = new SizeStatusBarEntry();
	context.subscriptions.push(sizeStatusBarEntry);

	const binarySizeStatusBarEntry = new BinarySizeStatusBarEntry();
	context.subscriptions.push(binarySizeStatusBarEntry);

	const zoomStatusBarEntry = new ZoomStatusBarEntry();
	context.subscriptions.push(zoomStatusBarEntry);

	const previewManager = new PreviewManager(context.extensionUri, sizeStatusBarEntry, binarySizeStatusBarEntry, zoomStatusBarEntry);

	context.subscriptions.push(vscode.window.registerCustomEditorProvider(PreviewManager.viewType, previewManager, {
		supportsMultipleEditorsPerDocument: true,
	}));

	context.subscriptions.push(vscode.commands.registerCommand('tga.zoomIn', () => {
		previewManager.activePreview?.zoomIn();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('tga.zoomOut', () => {
		previewManager.activePreview?.zoomOut();
	}));

	// Mapped Images
	registerUpdateIniPathFeature(context);
	registerToolbarFeature(context);

}


