const http = require('http');
const fs = require('fs');
const path = require('path');

const SVG_DIR = path.join(__dirname, 'svg');
const PORT = 3000;

function getFolders(type) {
  return fs.readdirSync(path.join(SVG_DIR, type), { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name)
    .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
}
function getSvgFiles(type, folder) {
  return fs.readdirSync(path.join(SVG_DIR, type, folder)).filter(f => f.endsWith('.svg')).sort();
}
function getSvgContent(type, folder, file) {
  return fs.readFileSync(path.join(SVG_DIR, type, folder, file), 'utf-8');
}

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Game Icon Pack Browser</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#141419;color:#C3C3D9;display:flex;height:100vh;overflow:hidden}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#525266;border-radius:3px}

  .sidebar{width:220px;background:#272730;border-right:1px solid #272730;display:flex;flex-direction:column;flex-shrink:0}
  .sidebar-header{padding:20px;border-bottom:1px solid #272730}
  .sidebar-header h1{font-size:15px;color:#F0F0FF;font-weight:600}
  .sidebar-header p{font-size:11px;color:#6C6C80;margin-top:4px}
  .search-box{padding:12px 16px;border-bottom:1px solid #272730}
  .search-box input{width:100%;background:#141419;border:1px solid #272730;color:#C3C3D9;padding:8px 10px;border-radius:6px;font-size:12px;outline:none;transition:border-color .15s}
  .search-box input:focus{border-color:#FA7087}
  .search-box input::placeholder{color:#6C6C80}
  .folder-list{flex:1;overflow-y:auto;padding:8px 0}
  .folder-item{padding:10px 20px;cursor:pointer;font-size:13px;color:#9D9DB2;display:flex;align-items:center;justify-content:space-between;border-left:2px solid transparent;transition:color .12s,background .12s}
  .folder-item:hover{color:#C3C3D9;background:rgba(255,255,255,.03)}
  .folder-item.active{color:#CECCFF;background:rgba(206,204,255,.06);border-left-color:#FA7087}
  .folder-item .count{font-size:11px;color:#6C6C80;background:#141419;padding:2px 8px;border-radius:10px}
  .folder-item.active .count{background:rgba(206,204,255,.1);color:#CECCFF}

  .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
  .toolbar{padding:14px 24px;border-bottom:1px solid #272730;background:#272730;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  .toolbar label{font-size:11px;color:#6C6C80;text-transform:uppercase;letter-spacing:.5px}
  .toolbar input[type=color]{width:28px;height:24px;border:1px solid #272730;border-radius:4px;cursor:pointer;background:none}
  .size-slider{display:flex;align-items:center;gap:8px}
  .size-slider .track{position:relative;width:72px;height:4px;background:#525266;border-radius:2px;cursor:pointer}
  .size-slider .fill{position:absolute;left:0;top:0;height:100%;background:#FA7087;border-radius:2px;pointer-events:none;transition:width .05s}
  .size-slider .thumb{position:absolute;top:50%;width:14px;height:14px;background:#FA7087;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 0 0 3px rgba(250,112,135,.2);transition:left .05s}
  .size-slider .val{font-size:11px;color:#CECCFF;min-width:28px;font-variant-numeric:tabular-nums}
  .toggle-group{display:flex;align-items:center;gap:8px}
  .toggle{position:relative;width:36px;height:20px;cursor:pointer}
  .toggle input{display:none}
  .toggle .track{position:absolute;inset:0;background:#525266;border-radius:10px;transition:background .15s}
  .toggle input:checked+.track{background:#FA7087}
  .toggle .thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .15s}
  .toggle input:checked~.thumb{transform:translateX(16px)}

  .grid-wrap{flex:1;overflow-y:auto;padding:20px 24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--col,100px),1fr));gap:10px;align-content:start}
  .icon-card{background:#272730;border:1px solid #272730;border-radius:10px;display:flex;flex-direction:column;align-items:center;padding:18px 8px 10px;cursor:pointer;position:relative;animation:in .18s ease both}
  @keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .icon-card:hover{border-color:#FA7087;background:#141419;transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.4);transition:border-color .15s,background .15s,transform .15s,box-shadow .15s}
  .icon-card:active{transform:scale(.97);transition:transform .08s}
  .icon-card svg{width:var(--s,48px);height:var(--s,48px);pointer-events:none;display:block;transition:transform .15s}
  .icon-card:hover svg{transform:scale(1.1)}
  .icon-card .name{font-size:10px;color:#6C6C80;margin-top:8px;text-align:center;word-break:break-all;line-height:1.3;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;transition:color .15s}
  .icon-card:hover .name{color:#9D9DB2}
  .icon-card .toast{position:absolute;top:-30px;left:50%;transform:translateX(-50%);background:#FA7087;color:#fff;font-size:11px;padding:4px 10px;border-radius:20px;opacity:0;pointer-events:none;white-space:nowrap;z-index:5;transition:opacity .2s,top .2s}
  .icon-card .toast.show{opacity:1;top:-34px}
  .icon-card .dl{position:absolute;top:6px;right:6px;width:28px;height:28px;background:#FA7087;border:none;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;z-index:2;transition:opacity .15s,transform .15s}
  .icon-card:hover .dl{opacity:1}
  .icon-card .dl:hover{transform:scale(1.1)}
  .icon-card .dl:active{transform:scale(.9);transition:transform .08s}
  .icon-card .dl svg{width:14px;height:14px;fill:#fff}
  .empty{text-align:center;padding:80px 20px;color:#6C6C80;font-size:14px;grid-column:1/-1}

  @media(max-width:700px){
    body{flex-direction:column}
    .sidebar{width:100%;flex-direction:row;flex-wrap:wrap}
    .sidebar-header{display:none}
    .search-box{flex:1;min-width:140px;border-bottom:none;border-right:1px solid #272730}
    .folder-list{display:flex;overflow-x:auto;overflow-y:hidden;padding:0;flex:none}
    .folder-item{border-left:none;border-bottom:2px solid transparent;white-space:nowrap;padding:10px 14px}
    .folder-item.active{border-left:none;border-bottom-color:#FA7087}
  }
</style>
</head>
<body>
<div class="sidebar">
  <div class="sidebar-header"><h1>Game Icon Pack Browser</h1><p id="info"></p></div>
  <div class="search-box"><input type="text" id="search" placeholder="Search..."></div>
  <div class="folder-list" id="folderList"></div>
</div>
<div class="main">
  <div class="toolbar">
    <div class="toggle-group"><span style="font-size:11px;color:#6C6C80;text-transform:uppercase;letter-spacing:.5px">Padding</span><label class="toggle"><input type="checkbox" id="paddingToggle" checked><div class="track"></div><div class="thumb"></div></label></div>
    <div class="size-slider"><span style="font-size:11px;color:#6C6C80;text-transform:uppercase;letter-spacing:.5px">Size</span><div class="track" id="sizeTrack"><div class="fill" id="sizeFill"></div><div class="thumb" id="sizeThumb"></div></div><span class="val" id="sizeVal">48</span></div>
    <label>Color</label><input type="color" id="colorPicker" value="#C3C3D9">
  </div>
  <div class="grid-wrap"><div class="grid" id="grid"></div></div>
</div>
<script>
let D={},F='',S=48,C='#C3C3D9',Q='',P='padding',T=null;

async function L(){
  const r=await fetch('/api/folders?type='+P);
  D=await r.json();
  const K=Object.keys(D),t=K.reduce((s,f)=>s+D[f].length,0);
  info.textContent=t+' icons · '+K.length+' categories';
  folderList.innerHTML=K.map(f=>'<div class="folder-item" data-folder="'+f+'">'+f.replace(/^\d+\./,'')+'<span class="count">'+D[f].length+'</span></div>').join('');
  folderList.querySelectorAll('.folder-item').forEach(i=>i.onclick=()=>{F=i.dataset.folder;document.querySelectorAll('.folder-item').forEach(x=>x.classList.toggle('active',x.dataset.folder===F));R()});
  if(K.length){F=K[0];folderList.firstChild.classList.add('active');R()}
}

function R(){
  const f=(D[F]||[]).filter(x=>x.toLowerCase().includes(Q.toLowerCase()));
  if(!f.length){grid.innerHTML='<div class="empty">Nothing here</div>';return}
  grid.innerHTML=f.map((x,i)=>'<div class="icon-card" data-file="'+x+'" title="Click to copy" style="animation-delay:'+(i*.012)+'s"><div class="toast">Copied!</div><button class="dl" title="Download"><svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></button><div class="is" data-folder="'+F+'" data-file="'+x+'"></div><div class="name">'+x.replace('.svg','')+'</div></div>').join('');
  grid.querySelectorAll('.icon-card').forEach(c=>c.onclick=()=>K(c));
  grid.querySelectorAll('.dl').forEach(b=>b.onclick=e=>{e.stopPropagation();W(b)});
  V()
}

function colorSvg(s,c){s=s.replace(/fill="(?!none)[^"]*"/g,'fill="'+c+'"').replace(/fill: ?[^;"]+/g,'fill:'+c).replace(/currentColor/g,c);if(!/fill="/.test(s)&&!/fill:/.test(s))s=s.replace(/<svg/,'<svg fill="'+c+'"');return s}

async function V(){
  const h=document.querySelectorAll('.is');
  const r=await Promise.all([...h].map(async x=>{const res=await fetch('/api/svg/'+P+'/'+x.dataset.folder+'/'+x.dataset.file);let s=await res.text();s=colorSvg(s,C);s=s.replace(/<svg/,'<svg style="width:'+S+'px;height:'+S+'px"');return{x,s}}));
  r.forEach(({x,s})=>x.innerHTML=s)
}

async function U(){
  const h=document.querySelectorAll('.is');
  if(!h.length)return;
  const r=await Promise.all([...h].map(async x=>{const res=await fetch('/api/svg/'+P+'/'+x.dataset.folder+'/'+x.dataset.file);let s=await res.text();s=colorSvg(s,C);s=s.replace(/<svg/,'<svg style="width:'+S+'px;height:'+S+'px"');return{x,s}}));
  r.forEach(({x,s})=>x.innerHTML=s)
}

async function K(c){
  const r=await fetch('/api/svg/'+P+'/'+F+'/'+c.dataset.file);
  await navigator.clipboard.writeText(await r.text());
  const t=c.querySelector('.toast');t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),1200)
}

async function W(b){
  const file=b.parentElement.dataset.file;
  let s=colorSvg(await(await fetch('/api/svg/'+P+'/'+F+'/'+file)).text(),C);
  s=s.replace(/width="[^"]*"/,'').replace(/height="[^"]*"/,'').replace(/<svg/,'<svg width="48" height="48"');
  const bl=new Blob([s],{type:'image/svg+xml'}),u=URL.createObjectURL(bl),a=document.createElement('a');
  a.href=u;a.download=file;document.body.appendChild(a);a.click();
  document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(u),1e3)
}

const track=document.getElementById('sizeTrack'),fill=document.getElementById('sizeFill'),thumb=document.getElementById('sizeThumb'),val=document.getElementById('sizeVal');
function setUI(v){const p=((v-24)/96)*100;fill.style.width=p+'%';thumb.style.left=p+'%';val.textContent=v}
function fromEvent(e){const r=track.getBoundingClientRect(),x=e.touches?e.touches[0].clientX:e.clientX;return Math.round(24+Math.max(0,Math.min(1,(x-r.left)/r.width))*96)}
track.onpointerdown=e=>{track.setPointerCapture(e.pointerId);S=fromEvent(e);setUI(S);grid.style.setProperty('--col',(S+56)+'px');grid.style.setProperty('--s',S+'px');document.querySelectorAll('.is svg').forEach(s=>{s.style.width=S+'px';s.style.height=S+'px'})}
track.onpointermove=e=>{if(e.buttons)S=fromEvent(e),setUI(S),grid.style.setProperty('--col',(S+56)+'px'),grid.style.setProperty('--s',S+'px'),document.querySelectorAll('.is svg').forEach(s=>{s.style.width=S+'px';s.style.height=S+'px'})}
setUI(48);

paddingToggle.onchange=e=>{P=e.target.checked?'padding':'no-padding';F='';Q='';search.value='';L()}
colorPicker.oninput=e=>{C=e.target.value;clearTimeout(T);T=setTimeout(U,80)}
search.oninput=e=>{Q=e.target.value;document.querySelectorAll('.folder-item').forEach(i=>{const f=i.dataset.folder,t=D[f].length,m=Q?D[f].filter(x=>x.toLowerCase().includes(Q.toLowerCase())).length:t;i.querySelector('.count').textContent=m;i.style.opacity=Q&&!m?.3:1});R()}

L()
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(HTML) }
  if (u.pathname === '/api/folders') {
    const t = u.searchParams.get('type') || 'padding', d = {};
    for (const f of getFolders(t)) d[f] = getSvgFiles(t, f);
    res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(d))
  }
  if (u.pathname === '/api/icons') {
    const d = {};
    for (const f of getFolders('padding')) d[f] = getSvgFiles('padding', f);
    res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(d))
  }
  if (u.pathname.startsWith('/api/svg/')) {
    const p = u.pathname.slice(9).split('/'), t = p[0], f = decodeURIComponent(p[1]), fl = decodeURIComponent(p[2]);
    try { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(getSvgContent(t, f, fl)) }
    catch { res.writeHead(404); return res.end('Not found') }
  }
  res.writeHead(404); res.end('Not found')
});

server.listen(PORT, () => console.log('http://localhost:' + PORT));