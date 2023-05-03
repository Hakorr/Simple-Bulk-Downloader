const downloadBtnElem = document.querySelector('#download-btn');
const urlTextareaElem = document.querySelector('#url-textarea');
const separatorInputElem = document.querySelector('#separator-input');
const rightPanelElem = document.querySelector('.right-panel');
const ratelimitTimeoutInputElem = document.querySelector('#ratelimit-timeout-input');
const queueItems = [];

let defaultRatelimitTimeout = 5000;
let separatorStr = '\n';

separatorInputElem.value = '\\n';
ratelimitTimeoutInputElem.value = defaultRatelimitTimeout;

function separateURLs(str) {
	return str.replace(/ /g,'').split(separatorStr);
}

function createQueueItem(url, idx) {
	const queueItemElem = document.createElement('div');
		queueItemElem.classList.add('queue-item');
		queueItemElem.dataset.for = url;
		queueItemElem.innerHTML = `
		<div class="queue-item-number">${idx + 1}</div>
		<div class="queue-item-text">${url}</div>
		<div class="download-indicator"></div>`;

	return queueItemElem;
}

function findQueueItemByURL(url) {
	return queueItems.find(el => el.dataset.for === url);
}

function resetQueueItems() {
	queueItems.forEach(elem => {
		const downloadIndicator = elem.querySelector('.download-indicator');

		downloadIndicator.style['width'] = '0%';
		downloadIndicator.style['background-color'] = '#3cb371';
		downloadIndicator.style['box-shadow'] = '0px 0px 5px #3cb371';
	});
}

function setQueueItemStatus(url, status, message) {
	const queueItem = findQueueItemByURL(url);
	const downloadIndicator = queueItem.querySelector('.download-indicator');

	switch(status) {
		case 'error':
			downloadIndicator.style['width'] = '100%';
			downloadIndicator.style['background-color'] = 'red';
			downloadIndicator.style['box-shadow'] = '0px 0px 5px red';
			break;
		case 'ratelimit':
			downloadIndicator.style['width'] = '100%';
			downloadIndicator.style['background-color'] = 'orange';
			downloadIndicator.style['box-shadow'] = '0px 0px 5px orange';
			break;
	}
}

// Function to download a single file and add it to the zip archive
async function downloadFileAndAddToZip(zip, fileURL) {
	try {
		const response = await fetch(fileURL);
		const data = await response.blob();
		const filename = fileURL.split('/').pop();

		zip.file(filename, data);

		const queueItem = findQueueItemByURL(fileURL);
		const downloadIndicator = queueItem.querySelector('.download-indicator');

		const responseClone = new Response(data);
		const reader = responseClone.body.getReader();

		const totalSize = data.size;
		let loadedSize = 0;

		function processResult(result) {
			if (result.done) {
				console.log('Download completed', fileURL);
				return;
			}

			loadedSize += result.value.length;
			const progress = Math.floor((loadedSize / totalSize) * 100);

			downloadIndicator.style.width = `${progress}%`;

			return reader.read().then(processResult);
		}

		reader.read().then(processResult);
	} catch(e) {
		setQueueItemStatus(fileURL, 'error', e);
	}
}
  
downloadBtnElem.onclick = async function() {
	resetQueueItems();

	const zip = new JSZip();
	const files = separateURLs(urlTextareaElem.value);
	
	for (const fileURL of files) {
		downloadFileAndAddToZip(zip, fileURL);
	}
	
	await zip.generateAsync({ type: 'blob' })
		.then(function(content) {
			saveAs(content, "files.zip");
		});
	
	downloadBtnElem.innerText = `Download`;
};

urlTextareaElem.oninput = function() {
	queueItems.forEach(elem => elem.remove());

	const separatedURLs = separateURLs(urlTextareaElem.value);

	separatedURLs.forEach((url, idx) => {
		const queueItemElem = createQueueItem(url, idx);

		rightPanelElem.appendChild(queueItemElem);

		queueItems.push(queueItemElem);
	});

	downloadBtnElem.innerText = `Download (${separatedURLs.length} files)`;
}

separatorInputElem.oninput = function() {
	separatorStr = separatorInputElem.value;
}

ratelimitTimeoutInputElem.oninput = function() {
	defaultRatelimitTimeout = ratelimitTimeoutInputElem.value;
}