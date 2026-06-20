const http = require('http');
const fs = require('fs');
const path = require('path');

const SVG_DIR = path.join(__dirname, 'svg-v1.0.3');
const PORT = 3000;

function getFolders() {
  return fs.readdirSync(SVG_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
}

function getSvgFiles(folder) {
  const dir = path.join(SVG_DIR, folder);
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.svg'))
    .sort();
}

function getSvgContent(folder, file) {
  const filePath = path.join(SVG_DIR, folder, file);
  return fs.readFileSync(filePath, 'utf-8');
}

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Game Icon Pack Browser</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f0f0f; color: #e0e0e0; }
  .header { background: #1a1a2e; padding: 20px 32px; border-bottom: 1px solid #2a2a4a; position: sticky; top: 0; z-index: 10; }
  .header h1 { font-size: 22px; font-weight: 600; color: #fff; }
  .header p { font-size: 13px; color: #888; margin-top: 4px; }
  .controls { display: flex; gap: 16px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
  .controls label { font-size: 13px; color: #aaa; }
  .controls input[type=range] { width: 120px; accent-color: #6c63ff; }
  .controls input[type=color] { width: 36px; height: 28px; border: 1px solid #444; border-radius: 4px; cursor: pointer; background: none; }
  .controls input[type=text] { background: #222; border: 1px solid #444; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 13px; width: 200px; }
  .controls input[type=text]::placeholder { color: #666; }
  .size-val { font-size: 12px; color: #6c63ff; min-width: 32px; }
  .tabs { display: flex; gap: 0; background: #141428; border-bottom: 1px solid #2a2a4a; overflow-x: auto; }
  .tab { padding: 10px 20px; cursor: pointer; font-size: 13px; color: #888; border-bottom: 2px solid transparent; white-space: nowrap; transition: all .2s; }
  .tab:hover { color: #bbb; background: #1a1a35; }
  .tab.active { color: #6c63ff; border-bottom-color: #6c63ff; background: #1a1a35; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; padding: 24px 32px; }
  .icon-card { background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 10px; display: flex; flex-direction: column; align-items: center; padding: 16px 8px 10px; cursor: pointer; transition: all .2s; position: relative; }
  .icon-card:hover { border-color: #6c63ff; background: #22223a; transform: translateY(-2px); box-shadow: 0 4px 16px rgba(108,99,255,.15); }
  .icon-card svg { width: var(--svg-size); height: var(--svg-size); }
  .icon-card .name { font-size: 11px; color: #888; margin-top: 8px; text-align: center; word-break: break-all; line-height: 1.3; }
  .icon-card .toast { position: absolute; top: -28px; background: #6c63ff; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 4px; opacity: 0; transition: opacity .3s; pointer-events: none; }
  .icon-card .toast.show { opacity: 1; }
  .icon-card .download-btn { position: absolute; top: 6px; right: 6px; width: 28px; height: 28px; background: #6c63ff; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .2s; }
  .icon-card:hover .download-btn { opacity: 1; }
  .icon-card .download-btn:hover { background: #5a52e0; }
  .icon-card .download-btn svg { width: 14px; height: 14px; fill: #fff; }
  .empty { text-align: center; padding: 60px; color: #555; font-size: 14px; }
  @media (max-width: 600px) { .grid { padding: 12px; gap: 8px; } .header { padding: 14px 16px; } }
</style>
</head>
<body>
<div class="header">
  <h1>Game Icon Pack Browser</h1>
  <p id="info"></p>
  <div class="controls">
    <input type="text" id="search" placeholder="Search icon name...">
    <label>Size</label>
    <input type="range" id="sizeSlider" min="24" max="120" value="48">
    <span class="size-val" id="sizeVal">48px</span>
    <label>Color</label>
    <input type="color" id="colorPicker" value="#e0e0e0">
  </div>
</div>
<div class="tabs" id="tabs"></div>
<div class="grid" id="grid"></div>

<script>
let allData = {};
let currentFolder = '';
let iconSize = 48;
let iconColor = '#e0e0e0';
let searchQuery = '';

async function loadData() {
  const res = await fetch('/api/icons');
  allData = await res.json();
  const folders = Object.keys(allData);
  const total = folders.reduce((s, f) => s + allData[f].length, 0);
  document.getElementById('info').textContent = total + ' icons in ' + folders.length + ' categories';
  renderTabs(folders);
  if (folders.length) selectFolder(folders[0]);
}

function renderTabs(folders) {
  const el = document.getElementById('tabs');
  el.innerHTML = folders.map(f => '<div class="tab" data-folder="' + f + '">' + f.replace(/^\d+\./, '') + ' (' + allData[f].length + ')</div>').join('');
  el.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => selectFolder(t.dataset.folder)));
}

function selectFolder(folder) {
  currentFolder = folder;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.folder === folder));
  renderGrid();
}

function updateTabCounts() {
  document.querySelectorAll('.tab').forEach(t => {
    const folder = t.dataset.folder;
    const total = allData[folder].length;
    if (searchQuery) {
      const matched = allData[folder].filter(f => f.toLowerCase().includes(searchQuery.toLowerCase())).length;
      t.textContent = folder.replace(/^\d+\./, '') + ' (' + matched + '/' + total + ')';
    } else {
      t.textContent = folder.replace(/^\d+\./, '') + ' (' + total + ')';
    }
  });
}

function renderGrid() {
  const files = (allData[currentFolder] || []).filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
  const el = document.getElementById('grid');
  if (!files.length) { el.innerHTML = '<div class="empty">No icons found</div>'; return; }
  el.innerHTML = files.map(f => {
    const name = f.replace('.svg', '');
    return '<div class="icon-card" data-file="' + f + '" title="Click to copy SVG">' +
      '<div class="toast">Copied!</div>' +
      '<button class="download-btn" data-folder="' + currentFolder + '" data-file="' + f + '" title="Download SVG"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></button>' +
      '<div class="icon-svg" data-folder="' + currentFolder + '" data-file="' + f + '"></div>' +
      '<div class="name">' + name + '</div></div>';
  }).join('');
  el.querySelectorAll('.icon-card').forEach(c => c.addEventListener('click', () => copySvg(c)));
  el.querySelectorAll('.download-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); downloadSvg(b); }));
  loadVisibleSvgs();
}

async function loadVisibleSvgs() {
  const holders = document.querySelectorAll('.icon-svg');
  for (const h of holders) {
    const res = await fetch('/api/svg/' + encodeURIComponent(h.dataset.folder) + '/' + encodeURIComponent(h.dataset.file));
    let svg = await res.text();
    svg = svg.replace(/fill="[^"]*"/g, 'fill="' + iconColor + '"');
    svg = svg.replace(/<svg/, '<svg style="width:' + iconSize + 'px;height:' + iconSize + 'px"');
    h.innerHTML = svg;
  }
}

async function copySvg(card) {
  const file = card.dataset.file;
  const res = await fetch('/api/svg/' + encodeURIComponent(currentFolder) + '/' + encodeURIComponent(file));
  const svg = await res.text();
  await navigator.clipboard.writeText(svg);
  const toast = card.querySelector('.toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1200);
}

async function downloadSvg(btn) {
  const folder = btn.dataset.folder;
  const file = btn.dataset.file;
  const res = await fetch('/api/svg/' + encodeURIComponent(folder) + '/' + encodeURIComponent(file));
  let svg = await res.text();
  svg = svg.replace(/fill="[^"]*"/g, 'fill="' + iconColor + '"');
  svg = svg.replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '');
  svg = svg.replace(/<svg/, '<svg width="48" height="48"');
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById('sizeSlider').addEventListener('input', e => {
  iconSize = +e.target.value;
  document.getElementById('sizeVal').textContent = iconSize + 'px';
  document.querySelectorAll('.icon-svg svg').forEach(s => { s.style.width = iconSize + 'px'; s.style.height = iconSize + 'px'; });
  document.getElementById('grid').style.gridTemplateColumns = 'repeat(auto-fill, minmax(' + (iconSize + 52) + 'px, 1fr))';
});

document.getElementById('colorPicker').addEventListener('input', e => {
  iconColor = e.target.value;
  loadVisibleSvgs();
});

document.getElementById('search').addEventListener('input', e => {
  searchQuery = e.target.value;
  updateTabCounts();
  renderGrid();
});

loadData();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  if (url.pathname === '/api/icons') {
    const data = {};
    for (const folder of getFolders()) {
      data[folder] = getSvgFiles(folder);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  if (url.pathname.startsWith('/api/svg/')) {
    const parts = url.pathname.slice('/api/svg/'.length).split('/');
    const folder = decodeURIComponent(parts[0]);
    const file = decodeURIComponent(parts[1]);
    try {
      const svg = getSvgContent(folder, file);
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(svg);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('Icon Browser running at http://localhost:' + PORT);
});
