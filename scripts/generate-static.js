const fs = require('fs');
const path = require('path');

const SVG_DIR = path.join(__dirname, '..', 'svg');
const DIST_DIR = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

const data = {};
const types = fs.readdirSync(SVG_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

types.forEach(type => {
  const typePath = path.join(SVG_DIR, type);
  data[type] = {};
  const folders = fs.readdirSync(typePath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  folders.forEach(folder => {
    const folderPath = path.join(typePath, folder);
    const files = fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.svg'))
      .sort();
    data[type][folder] = files;
  });
});

fs.writeFileSync(
  path.join(DIST_DIR, 'data.json'),
  JSON.stringify(data, null, 2)
);
console.log('[√] data.json generated successfully');

fs.copyFileSync(
  path.join(__dirname, '..', 'index.html'),
  path.join(DIST_DIR, 'index.html')
);
console.log('[√] index.html copied successfully');

const svgDest = path.join(DIST_DIR, 'svg');
if (fs.existsSync(svgDest)) {
  fs.rmSync(svgDest, { recursive: true, force: true });
}
fs.cpSync(SVG_DIR, svgDest, { recursive: true });
console.log('[√] SVG directory copy completed.');
