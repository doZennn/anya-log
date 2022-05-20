/* eslint-disable no-unused-vars */
import 'https://cdn.skypack.dev/pin/@stardazed/streams-polyfill@v2.4.0-rGaekSLyjXRF7WfO54dC/mode=imports/optimized/@stardazed/streams-polyfill.js';
import untar from 'https://cdn.skypack.dev/pin/js-untar-lhc@v2.1.1-L7n4ZX1UhO8CDpqnZH1i/mode=imports,min/optimized/js-untar-lhc.js';
import {isBinary} from 'https://cdn.skypack.dev/pin/istextorbinary@v6.0.0-rcru39eisf9dWFZW71DP/mode=imports,min/optimized/istextorbinary.js';

/*
  Polyfill file blob streaming
  https://github.com/stardazed/sd-streams/issues/8
*/
class PatchableReadableStream extends ReadableStream {
  constructor (reader) {
    super({
      async start(controller) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
        reader.releaseLock();
      }
    });
  }
}
  
const downloadURL = (data, fileName) => {
  const a = document.createElement('a');
  a.href = data;
  a.download = fileName;
  document.body.appendChild(a);
  a.style.display = 'none';
  a.click();
  a.remove();
};

const fromHex = hexString => new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
const humanFileSize = (bytes, si = false, dp = 1) => {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si 
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
};

const getLog = async (logKey) => {
  const isDeleteKey = logKey.includes(':');

  // Most reverse proxies log GET by default, so just send key in the POST body
  const response = await fetch(isDeleteKey ? '/logs' : '/logs/getlog', {
    method: isDeleteKey ? 'delete' : 'post',
    body: logKey,
    headers: {
      'Content-Type': 'text/plain'
    }
  });

  if (response.status === 204 && isDeleteKey) {
    throw new Error('Log successfully deleted.');
  }

  const resJson = await response.json();
  if (response.status != 200) {
    const err = new Error('Could not get log info.');
    err.response = response;
    if (resJson) {
      err.message = resJson.error;
    }
    throw err;
  }
  const { iv: ivHex, path, hash } = resJson;
  
  const getArchiveFile = await fetch(path);
  const archiveBuffer = await getArchiveFile.arrayBuffer();
  
  const rawKey = fromHex(hash);
  const iv = fromHex(ivHex);
  
  try {
    const key = await window.crypto.subtle.importKey('raw', rawKey, 'AES-CBC', true, ['decrypt']);
    const decryptedBuffer = await window.crypto.subtle.decrypt({ name: 'AES-CBC', iv, }, key, archiveBuffer);
    return decryptedBuffer;
  } catch (error) {
    console.error(error);
    throw new Error('Error decrypting log archive.');
  }
};
  
const ungzip = async (archiveBuffer) => {
  const archiveStream = new Blob([archiveBuffer], { type: 'application/octet-stream' });
  const decompressor = new window.DecompressionStream('gzip');
  
  let deStream;
  if (typeof new Blob().stream().pipeThrough !== 'function') {
    const readableStream = new PatchableReadableStream(archiveStream.stream().getReader());
    deStream = readableStream.pipeThrough(decompressor);
  } else {
    deStream = archiveStream.stream().pipeThrough(decompressor);
  }
  const deBlob = await new Response(deStream).blob();
  return deBlob;
};

(async () => {
  let currentTarball;

  // elements
  const errorBox = document.getElementById('error-box');
  const searchForm = document.getElementById('search-log');
  const downloadAll = document.getElementById('download-all');
  const filesContainer = document.getElementById('files-container');

  // templates
  const fileblockTpl = document.querySelector('#fileblock');
  const lineTpl = document.querySelector('#logline');

  const handleDownload = (blob, name) => {
    const url = window.URL.createObjectURL(blob);
    downloadURL(url, name);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  const renderFiles = async (files) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileString = file.readAsString();
      const lines = fileString.split('\n');

      // Create file block
      const fileBlockEl = fileblockTpl.content.cloneNode(true);

      // fill file info
      const toolbar = fileBlockEl.querySelector('.file-toolbar');
      toolbar.querySelector('.filename').textContent = file.name;
      toolbar.querySelector('.linecount').textContent = `(${lines.length.toLocaleString()} line${lines.length === 1 ? '' : 's'})`;
      toolbar.querySelector('.filesize').textContent = humanFileSize(file.buffer.byteLength, true, 2);
      toolbar.querySelector('.filesize').title = `${file.buffer.byteLength.toLocaleString()} bytes`;
      toolbar.querySelector('.download').addEventListener('click', () => handleDownload(file.blob, file.name), false);

      // add lines to ol
      const ol = fileBlockEl.querySelector('ol.file-contents');
      lines.forEach((line) => {
        if (line === '') line = '\n'; // replace empty line with whitespace, otherwise the li will have no height
        const lineEl = lineTpl.content.cloneNode(true);
        lineEl.querySelector('code').textContent = line;
        ol.appendChild(lineEl);
      });

      // Collapse if really long, binary, or large file size
      if (lines.length > 500 || isBinary(file.name, file.buffer) || file.buffer.byteLength > (1024 * 1024)) {
        fileBlockEl.querySelector('.file').classList.add('collapsed');
      }

      filesContainer.appendChild(fileBlockEl);
    }
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    downloadAll.setAttribute('hidden', true);
    filesContainer.innerHTML = '';
    errorBox.setAttribute('hidden', true);
    const fd = new FormData(evt.target); 
    const logKey = fd.get('log_id').trim().toLocaleUpperCase();
    try {
      const gzip = await getLog(logKey);
      const tarball = await ungzip(gzip);
      const files = await untar(await tarball.arrayBuffer());
      downloadAll.removeAttribute('hidden');
      history.replaceState(null, '', `#!${logKey}`);
      currentTarball = tarball;
      renderFiles(files);
    } catch (error) {
      errorBox.innerText = error.message;
      errorBox.removeAttribute('hidden');
    }
  };
  downloadAll.addEventListener('click', () => handleDownload(currentTarball, 'logs.tar'), false);
  document.addEventListener('click', (evt) => {
    if (!evt.target.classList.contains('collapse')) return;
    evt.target.closest('.file').classList.toggle('collapsed');
  }, true);
  searchForm.addEventListener('submit', handleSubmit, false);

  // Autofill
  const urlhash = window.location.hash.trim();
  if (urlhash.length > 3 && urlhash.startsWith('#!')) {
    searchForm.querySelector('input').value = urlhash.substring(2, urlhash.length);
    searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
  }
})();