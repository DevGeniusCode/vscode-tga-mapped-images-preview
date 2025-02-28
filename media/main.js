/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// @ts-check
"use strict";

(function () {
	/**
	 * @param {number} value
	 * @param {number} min
	 * @param {number} max
	 * @return {number}
	 */
	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function getSettings() {
		const element = document.getElementById('image-preview-settings');
		if (element) {
			const data = element.getAttribute('data-settings');
			if (data) {
				return JSON.parse(data);
			}
		}

		throw new Error(`Could not load settings`);
	}

	/**
	 * Enable image-rendering: pixelated for images scaled by more than this.
	 */
	const PIXELATION_THRESHOLD = 3;

	const SCALE_PINCH_FACTOR = 0.075;
	const MAX_SCALE = 20;
	const MIN_SCALE = 0.1;

	const zoomLevels = [
		0.1,
		0.2,
		0.3,
		0.4,
		0.5,
		0.6,
		0.7,
		0.8,
		0.9,
		1,
		1.5,
		2,
		3,
		5,
		7,
		10,
		15,
		20
	];

	const settings = getSettings();
	const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

	const vscode = acquireVsCodeApi();

	document.getElementById('updateBtn').addEventListener('click', () => {
		const mappedImage = document.getElementById('mappedImageSelect').value;
		const coordinates = document.getElementById('coordinates').value;

		vscode.postMessage({
			command: 'updateCoordinates',
			data: { mappedImage, coordinates }
		});
	});

	vscode.postMessage({ command: 'getMappedImages' });

    let selectedImageInfo = null; // hold the selected image info.

	window.addEventListener('message', event => {
		const { command, data } = event.data;
		console.log('main.js - message', event.data);

		if (command === 'setMappedImages') {
			console.log('main.js - setMappedImages data', data);

			const mappedImageSelect = document.getElementById('mappedImageSelect');
			mappedImageSelect.innerHTML = '';
			data.mappedImages.forEach(imageInfo => {
				const option = document.createElement('option');
				option.value = imageInfo.mappedImageName;
				option.textContent = imageInfo.mappedImageName;
                option.imageInfo = imageInfo;
				mappedImageSelect.appendChild(option);
			});
			// Select first image if any
			if (data.mappedImages.length > 0) {
				selectedImageInfo = data.mappedImages[0];
				mappedImageSelect.value = data.mappedImages[0].mappedImageName;
				const coordinatesInput = document.getElementById('coordinates');
				let coords = selectedImageInfo?.coords;
				if(coords){
					coordinatesInput.value = `Left:${coords.left} Top:${coords.top} Right:${coords.right} Bottom:${coords.bottom}`;
					updateHighlightFrame(coords);
				}
			}
		}
	});

	const mappedImageSelect = document.getElementById('mappedImageSelect');
	mappedImageSelect.addEventListener('change', () => {
        selectedImageInfo =  document.getElementById('mappedImageSelect').selectedOptions[0].imageInfo;
        console.log('main.js - mappedImageSelect change', selectedImageInfo);
		const coordinatesInput = document.getElementById('coordinates');
        let coords = selectedImageInfo?.coords;

		if(coords){
			coordinatesInput.value = `Left:${coords.left} Top:${coords.top} Right:${coords.right} Bottom:${coords.bottom}`;

            updateHighlightFrame(coords);
		}else{
			coordinatesInput.value = '';
			highlightFrame.style.display = 'none';
		}
	});

	const initialState = vscode.getState() || { scale: 'fit', offsetX: 0, offsetY: 0 };

	// State
	let scale = initialState.scale;
	let ctrlPressed = false;
	let altPressed = false;
	let hasLoadedImage = false;
	let consumeClick = true;
	let isActive = false;

	// Elements
	const container = document.body;
	const image = document.createElement('img');

	const highlightFrame = document.createElement('div');
	highlightFrame.classList.add('highlight-frame');
	container.appendChild(highlightFrame);

    function updateHighlightFrame(coords) {
        if (!coords || !selectedImageInfo) {
            highlightFrame.style.display = 'none';
            return;
        }

        const imageRect = image.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const zoom =  parseFloat(image.style.zoom) || 1;
        const offsetX = imageRect.left - containerRect.left;
        const offsetY = imageRect.top - containerRect.top;

		highlightFrame.style.left = `${offsetX + (coords.left * zoom)}px`;
		highlightFrame.style.top = `${offsetY + (coords.top * zoom)}px`;
		highlightFrame.style.width = `${(coords.right - coords.left) * zoom}px`;
		highlightFrame.style.height = `${(coords.bottom - coords.top) * zoom}px`;
        highlightFrame.style.display = 'block';
    }

	function updateScale(newScale) {
		if (!image || !hasLoadedImage || !image.parentElement) {
			return;
		}
		let prevScale = scale;
		if (newScale === 'fit') {
			scale = 'fit';
			image.classList.add('scale-to-fit');
			image.classList.remove('pixelated');
			// @ts-ignore Non-standard CSS property
			image.style.zoom = 'normal';
			vscode.setState(undefined);
			highlightFrame.style.display = 'none';
		} else {
			scale = clamp(newScale, MIN_SCALE, MAX_SCALE);
			if (scale >= PIXELATION_THRESHOLD) {
				image.classList.add('pixelated');
			} else {
				image.classList.remove('pixelated');
			}

			const dx = (window.scrollX + container.clientWidth / 2) / container.scrollWidth;
			const dy = (window.scrollY + container.clientHeight / 2) / container.scrollHeight;

			image.classList.remove('scale-to-fit');
			// @ts-ignore Non-standard CSS property
			image.style.zoom = scale;

			const newScrollX = container.scrollWidth * dx - container.clientWidth / 2;
			const newScrollY = container.scrollHeight * dy - container.clientHeight / 2;

			window.scrollTo(newScrollX, newScrollY);

			vscode.setState({ scale: scale, offsetX: newScrollX, offsetY: newScrollY });
            // update the frame on zoom.
			if (selectedImageInfo) {
				let coords = selectedImageInfo?.coords;
				updateHighlightFrame(coords);
			}
		}

		vscode.postMessage({
			type: 'zoom',
			value: scale
		});
	}

	function setActive(value) {
		isActive = value;
		if (value) {
			if (isMac ? altPressed : ctrlPressed) {
				container.classList.remove('zoom-in');
				container.classList.add('zoom-out');
			} else {
				container.classList.remove('zoom-out');
				container.classList.add('zoom-in');
			}
		} else {
			ctrlPressed = false;
			altPressed = false;
			container.classList.remove('zoom-out');
			container.classList.remove('zoom-in');
		}
	}

	function firstZoom() {
		if (!image || !hasLoadedImage) {
			return;
		}

		scale = image.clientWidth / image.naturalWidth;
		updateScale(scale);
	}

	function zoomIn() {
		if (scale === 'fit') {
			firstZoom();
		}

		let i = 0;
		for (; i < zoomLevels.length; ++i) {
			if (zoomLevels[i] > scale) {
				break;
			}
		}
		updateScale(zoomLevels[i] || MAX_SCALE);
	}

	function zoomOut() {
		if (scale === 'fit') {
			firstZoom();
		}

		let i = zoomLevels.length - 1;
		for (; i >= 0; --i) {
			if (zoomLevels[i] < scale) {
				break;
			}
		}
		updateScale(zoomLevels[i] || MIN_SCALE);
	}

	window.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => {
		if (!image || !hasLoadedImage) {
			return;
		}
		ctrlPressed = e.ctrlKey;
		altPressed = e.altKey;

		if (isMac ? altPressed : ctrlPressed) {
			container.classList.remove('zoom-in');
			container.classList.add('zoom-out');
		}
	});

	window.addEventListener('keyup', (/** @type {KeyboardEvent} */ e) => {
		if (!image || !hasLoadedImage) {
			return;
		}

		ctrlPressed = e.ctrlKey;
		altPressed = e.altKey;

		if (!(isMac ? altPressed : ctrlPressed)) {
			container.classList.remove('zoom-out');
			container.classList.add('zoom-in');
		}
	});

	container.addEventListener('mousedown', (/** @type {MouseEvent} */ e) => {
		if (!image || !hasLoadedImage) {
			return;
		}

		if (e.button !== 0) {
			return;
		}

		ctrlPressed = e.ctrlKey;
		altPressed = e.altKey;

		consumeClick = !isActive;
		if (e.target && e.target.closest('#toolbar')) {
			consumeClick = true;
			return;
		}

	});

	container.addEventListener('click', (/** @type {MouseEvent} */ e) => {
		if (!image || !hasLoadedImage) {
			return;
		}

		if (e.button !== 0) {
			return;
		}

		if (consumeClick) {
			consumeClick = false;
			return;
		}
		// left click
		if (scale === 'fit') {
			firstZoom();
		}

		if (!(isMac ? altPressed : ctrlPressed)) { // zoom in
			zoomIn();
		} else {
			zoomOut();
		}
	});

	container.addEventListener('wheel', (/** @type {WheelEvent} */ e) => {
		// Prevent pinch to zoom
		if (e.ctrlKey) {
			e.preventDefault();
		}

		if (!image || !hasLoadedImage) {
			return;
		}

		const isScrollWheelKeyPressed = isMac ? altPressed : ctrlPressed;
		if (!isScrollWheelKeyPressed && !e.ctrlKey) { // pinching is reported as scroll wheel + ctrl
			return;
		}

		if (scale === 'fit') {
			firstZoom();
		}

		let delta = e.deltaY > 0 ? 1 : -1;
		updateScale(scale * (1 - delta * SCALE_PINCH_FACTOR));
	}, { passive: false });

	window.addEventListener('scroll', e => {
		if (!image || !hasLoadedImage || !image.parentElement || scale === 'fit') {
			return;
		}

		const entry = vscode.getState();
		if (entry) {
			vscode.setState({ scale: entry.scale, offsetX: window.scrollX, offsetY: window.scrollY });
		}
	}, { passive: true });

	container.classList.add('image');

	image.classList.add('scale-to-fit');

	image.addEventListener('load', () => {
		if (hasLoadedImage) {
			return;
		}
		hasLoadedImage = true;
		console.log("image loaded and container ready");

		vscode.postMessage({
			type: 'size',
			value: `${image.naturalWidth}x${image.naturalHeight}`,
		});

		document.body.classList.remove('loading');

		document.body.classList.add('ready');
		document.body.append(image);

		updateScale(scale);

		if (initialState.scale !== 'fit') {
			window.scrollTo(initialState.offsetX, initialState.offsetY);
		}
	});

	image.addEventListener('error', e => {
		if (hasLoadedImage) {
			return;
		}

		hasLoadedImage = true;
		document.body.classList.add('error');
		document.body.classList.remove('loading');
	});

	image.src = settings.src;

	document.querySelector('.open-file-link').addEventListener('click', () => {
		vscode.postMessage({
			type: 'reopen-as-text',
		});
	});

	window.addEventListener('message', e => {
		if (e.origin !== window.origin) {
			console.error('Dropping message from unknown origin in image preview');
			return;
		}

		switch (e.data.type) {
			case 'setScale':
				updateScale(e.data.scale);
				break;

			case 'setActive':
				setActive(e.data.value);
				break;

			case 'zoomIn':
				zoomIn();
				break;

			case 'zoomOut':
				zoomOut();
				break;
		}
	});
}());