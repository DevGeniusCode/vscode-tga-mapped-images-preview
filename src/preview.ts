/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { Disposable } from './dispose';
import { SizeStatusBarEntry } from './sizeStatusBarEntry';
import { Scale, ZoomStatusBarEntry } from './zoomStatusBarEntry';
import { BinarySizeStatusBarEntry } from './binarySizeStatusBarEntry';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { Stream } from 'stream';
import {getMappedImages, MappedImageInfo} from "./mapped_images/getMappedImages";
const TGA = require('tga');

const localize = nls.loadMessageBundle();

export class PreviewManager implements vscode.CustomReadonlyEditorProvider {

	public static readonly viewType = 'tga.previewEditor';

	private readonly _previews = new Set<Preview>();
	private _activePreview: Preview | undefined;

	constructor(
		private readonly extensionRoot: vscode.Uri,
		private readonly sizeStatusBarEntry: SizeStatusBarEntry,
		private readonly binarySizeStatusBarEntry: BinarySizeStatusBarEntry,
		private readonly zoomStatusBarEntry: ZoomStatusBarEntry,
	) { }

	public async openCustomDocument(uri: vscode.Uri) {
		return { uri, dispose: () => { } };
	}

	public async resolveCustomEditor(
		document: vscode.CustomDocument,
		webviewEditor: vscode.WebviewPanel,
	): Promise<void> {
		const preview = new Preview(this.extensionRoot, document.uri, webviewEditor, this.sizeStatusBarEntry, this.binarySizeStatusBarEntry, this.zoomStatusBarEntry);
		this._previews.add(preview);
		this.setActivePreview(preview);

		webviewEditor.onDidDispose(() => { this._previews.delete(preview); });

		webviewEditor.onDidChangeViewState(() => {
			if (webviewEditor.active) {
				this.setActivePreview(preview);
			} else if (this._activePreview === preview && !webviewEditor.active) {
				this.setActivePreview(undefined);
			}
		});
	}

	public get activePreview() { return this._activePreview; }

	private setActivePreview(value: Preview | undefined): void {
		this._activePreview = value;
		this.setPreviewActiveContext(!!value);
	}

	private setPreviewActiveContext(value: boolean) {
		vscode.commands.executeCommand('setContext', 'tgaFocus', value);
	}
}

const enum PreviewState {
	Disposed,
	Visible,
	Active,
}

class Preview extends Disposable {

	private readonly id: string = `${Date.now()}-${Math.random().toString()}`;

	private _previewState = PreviewState.Visible;
	private _imageSize: string | undefined;
	private _imageBinarySize: number | undefined;
	private _imageZoom: Scale | undefined;
	private texturesFilesMappedImagesDictionary: Record<string, MappedImageInfo[]> = {};

	private readonly emptyPngDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR42gEFAPr/AP///wAI/AL+Sr4t6gAAAABJRU5ErkJggg==';

	constructor(
		private readonly extensionRoot: vscode.Uri,
		private readonly resource: vscode.Uri,
		private readonly webviewEditor: vscode.WebviewPanel,
		private readonly sizeStatusBarEntry: SizeStatusBarEntry,
		private readonly binarySizeStatusBarEntry: BinarySizeStatusBarEntry,
		private readonly zoomStatusBarEntry: ZoomStatusBarEntry,
	) {
		super();
		const resourceRoot = resource.with({
			path: resource.path.replace(/\/[^\/]+?\.\w+$/, '/'),
		});

		webviewEditor.webview.options = {
			enableScripts: true,
			enableForms: false,
			localResourceRoots: [
				resourceRoot,
				extensionRoot,
			]
		};
		const iniFolderPath = vscode.workspace.getConfiguration('tgaPreview').get<string>('iniFolderPath') || undefined;
        let mappedImages: MappedImageInfo[] = [];
		if (iniFolderPath) {
			const { texturesFilesMappedImagesDictionary } = getMappedImages(iniFolderPath);
			this.texturesFilesMappedImagesDictionary = texturesFilesMappedImagesDictionary;

            // Get the file name of current tga file.
            const currentTextureFileName = path.basename(this.resource.fsPath, path.extname(this.resource.fsPath)).toLowerCase();

            // Find and set the textures of current tga file.
			if (texturesFilesMappedImagesDictionary[currentTextureFileName]) {
				mappedImages = texturesFilesMappedImagesDictionary[currentTextureFileName];
			}
			else {
				mappedImages = [];
			}

		// console.log('Preview - constructor this.texturesFilesMappedImagesDictionary',this.texturesFilesMappedImagesDictionary)
		}

		this.webviewEditor.webview.postMessage({
			command: 'setMappedImages',
			data: {
				mappedImages: mappedImages,
			},
		});
		this._register(webviewEditor.webview.onDidReceiveMessage(message => {
			switch (message.type) {
				case 'size':
					{
						this._imageSize = message.value;
						this.update();
						break;
					}
				case 'zoom':
					{
						this._imageZoom = message.value;
						this.update();
						break;
					}

				case 'reopen-as-text':
					{
						vscode.commands.executeCommand('vscode.openWith', resource, 'default', webviewEditor.viewColumn);
						break;
					}
			}
			switch (message.command) {
				case 'getMappedImages':
					// Find and set the mappedImages of current texture.tga file.
					const currentTextureFileName = path.basename(this.resource.fsPath).toLowerCase();

					let currentTexture : MappedImageInfo[] = [];
					for( const textureName in this.texturesFilesMappedImagesDictionary){
						if (textureName.toLowerCase() === currentTextureFileName){
							currentTexture = this.texturesFilesMappedImagesDictionary[textureName];
							break;
						}
					}
					const currentMappedImages = currentTexture.map(imageInfo => imageInfo.mappedImageName);
					// console.log('Preview - getTextures currentMappedImages', currentTextureFileName, currentMappedImages);

					webviewEditor.webview.postMessage({ command: 'setMappedImages', data: { mappedImages : currentTexture} });
					break;

				case 'updateCoordinates':
					console.log('Updated coordinates:', message.data);
					break;
			}
		}));

		this._register(zoomStatusBarEntry.onDidChangeScale(e => {
			if (this._previewState === PreviewState.Active) {
				this.webviewEditor.webview.postMessage({ type: 'setScale', scale: e.scale });
			}
		}));

		this._register(webviewEditor.onDidChangeViewState(() => {
			this.update();
			this.webviewEditor.webview.postMessage({ type: 'setActive', value: this.webviewEditor.active });
		}));

		this._register(webviewEditor.onDidDispose(() => {
			if (this._previewState === PreviewState.Active) {
				this.sizeStatusBarEntry.hide(this.id);
				this.binarySizeStatusBarEntry.hide(this.id);
				this.zoomStatusBarEntry.hide(this.id);
			}
			this._previewState = PreviewState.Disposed;
		}));

		const watcher = this._register(vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(resource, '*')));
		this._register(watcher.onDidChange(e => {
			if (e.toString() === this.resource.toString()) {
				this.render();
			}
		}));
		this._register(watcher.onDidDelete(e => {
			if (e.toString() === this.resource.toString()) {
				this.webviewEditor.dispose();
			}
		}));

		vscode.workspace.fs.stat(resource).then(({ size }) => {
			this._imageBinarySize = size;
			this.update();
		});

		this.render();
		this.update();
		this.webviewEditor.webview.postMessage({ type: 'setActive', value: this.webviewEditor.active });
	}

	public zoomIn() {
		if (this._previewState === PreviewState.Active) {
			this.webviewEditor.webview.postMessage({ type: 'zoomIn' });
		}
	}

	public zoomOut() {
		if (this._previewState === PreviewState.Active) {
			this.webviewEditor.webview.postMessage({ type: 'zoomOut' });
		}
	}

	private async render() {
		if (this._previewState !== PreviewState.Disposed) {
			this.webviewEditor.webview.html = await this.getWebviewContents();
		}
	}

	private update() {
		if (this._previewState === PreviewState.Disposed) {
			return;
		}

		if (this.webviewEditor.active) {
			this._previewState = PreviewState.Active;
			this.sizeStatusBarEntry.show(this.id, this._imageSize || '');
			this.binarySizeStatusBarEntry.show(this.id, this._imageBinarySize);
			this.zoomStatusBarEntry.show(this.id, this._imageZoom || 'fit');
		} else {
			if (this._previewState === PreviewState.Active) {
				this.sizeStatusBarEntry.hide(this.id);
				this.binarySizeStatusBarEntry.hide(this.id);
				this.zoomStatusBarEntry.hide(this.id);
			}
			this._previewState = PreviewState.Visible;
		}
	}

	private async getWebviewContents(): Promise<string> {
		const version = Date.now().toString();
		const settings = {
			src: await this.getResourcePath(this.webviewEditor, this.resource, version),
		};

    const toolbarHtml = `
        <div id="toolbar">
            <label for="mappedImageSelect">Select image:</label>
            <select id="mappedImageSelect"></select>
            <label for="coordinates">Coordinates:</label>
            <input id="coordinates" type="text" placeholder="Enter coordinates (Left, Top, Right, Bottom)" />
            <button id="updateBtn">Update</button>
        </div>
    `;

		const nonce = getNonce();

		const cspSource = this.webviewEditor.webview.cspSource;
		return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">

	<!-- Disable pinch zooming -->
	<meta name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">

	<title>Image Preview</title>
    <style>
        #toolbar {
            position: fixed;
            padding: 10px;
            background-color: #f0f0f0;
            border-bottom: 1px solid #ddd;
            color: #d61a1a;
        }
        body {
            margin: 0;
            padding: 0;
        }
		.highlight-frame {
		  position: absolute;
		  border: 5px solid red;
		  pointer-events: none;
		  display: none;
		}


    </style>
	<link rel="stylesheet" href="${escapeAttribute(this.extensionResource('/media/main.css'))}" type="text/css" media="screen" nonce="${nonce}">

	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${cspSource}; script-src 'nonce-${nonce}'; style-src ${cspSource} 'nonce-${nonce}';">
	<meta id="image-preview-settings" data-settings="${escapeAttribute(JSON.stringify(settings))}">
</head>
<body>
    ${toolbarHtml}
    <div class="container image scale-to-fit loading">
	<div class="loading-indicator"></div>
	<div class="image-load-error">
		<p>${localize('preview.imageLoadError', "An error occurred while loading the image.")}</p>
		<a href="#" class="open-file-link">${localize('preview.imageLoadErrorLink', "Open file using VS Code's standard text/binary editor?")}</a>
	</div>
    </div>
	<script src="${escapeAttribute(this.extensionResource('/media/main.js'))}" nonce="${nonce}"></script>
</body>
</html>`;
	}

	private async getResourcePath(webviewEditor: vscode.WebviewPanel, resource: vscode.Uri, version: string): Promise<string> {
		if (resource.scheme === 'git') {
			const stat = await vscode.workspace.fs.stat(resource);
			if (stat.size === 0) {
				return this.emptyPngDataUri;
			}
		}
		try {
			const data = fs.readFileSync(resource.fsPath);
			var tga = new TGA(data);
			var png = new PNG({
				width: tga.header.width,
				height: tga.header.height
			});
			png.data = tga.pixels;
			const promise = stream2buffer(png.pack());
			const buf = await promise;
			return `data:image/png;base64,${buf.toString('base64')}`;
		} catch (ex) {
			return this.emptyPngDataUri;
		}

	}

	private extensionResource(path: string) {
		return this.webviewEditor.webview.asWebviewUri(this.extensionRoot.with({
			path: this.extensionRoot.path + path
		}));
	}
}

function escapeAttribute(value: string | vscode.Uri): string {
	return value.toString().replace(/"/g, '&quot;');
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 64; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

async function stream2buffer(stream: Stream): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		const _buf = Array<any>();
		stream.on("data", chunk => _buf.push(chunk));
		stream.on("end", () => resolve(Buffer.concat(_buf)));
		stream.on("error", reject);
	});
} 