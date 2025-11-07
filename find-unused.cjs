const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src');
const exts = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif'];

function walk(dir){
  const res = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for(const it of items){
    const p = path.join(dir, it.name);
    if(it.isDirectory()) res.push(...walk(p));
    else if(it.isFile()) res.push(p);
  }
  return res;
}

function isSourceFile(p){
  return exts.includes(path.extname(p).toLowerCase());
}

function readFile(p){
  try { return fs.readFileSync(p, 'utf8'); } catch(e){ return ''; }
}

function extractSpecifiers(code){
  const specs = new Set();
  const importRegex = /import\s+(?:[^'\"]+from\s+)?['\"]([^'\"]+)['\"]/g;
  const exportRegex = /export\s+\*\s+from\s+['\"]([^'\"]+)['\"]/g;
  const dynamicRegex = /import\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
  let m;
  while((m = importRegex.exec(code))){ specs.add(m[1]); }
  while((m = exportRegex.exec(code))){ specs.add(m[1]); }
  while((m = dynamicRegex.exec(code))){ specs.add(m[1]); }
  const assetRegex = /['\"](\.\.\/|\.\/|\/|@\/)\S+?\.(png|jpe?g|svg|gif|json)['\"]/g;
  while((m = assetRegex.exec(code))){ specs.add(m[0].slice(1, -1)); }
  return Array.from(specs);
}

function resolveSpecifier(spec, importer){
  if(!spec) return null;
  if(spec.startsWith('@/')){
    const rel = spec.replace(/^@\//, '');
    for(const e of exts){
      const candidate = path.join(srcRoot, rel + e);
      if(fs.existsSync(candidate)) return path.normalize(candidate);
    }
    const cand2 = path.join(srcRoot, rel, 'index.js');
    if(fs.existsSync(cand2)) return path.normalize(cand2);
    return null;
  }
  if(spec.startsWith('/')){
    const rel = spec.replace(/^\//, '');
    const abs = path.join(projectRoot, rel);
    if(fs.existsSync(abs)) return path.normalize(abs);
    return null;
  }
  if(spec.startsWith('./') || spec.startsWith('../')){
    const base = path.dirname(importer);
    for(const e of exts){
      const candidate = path.resolve(base, spec + e);
      if(fs.existsSync(candidate)) return path.normalize(candidate);
    }
    const cand2 = path.resolve(base, spec);
    if(fs.existsSync(cand2)) return path.normalize(cand2);
    for(const e of exts){
      const candidateIdx = path.resolve(base, spec, 'index' + e);
      if(fs.existsSync(candidateIdx)) return path.normalize(candidateIdx);
    }
    return null;
  }
  return null;
}

const allFiles = walk(srcRoot).filter(isSourceFile).map(p => path.normalize(p));
const importsMap = new Map();
for(const f of allFiles){
  const code = readFile(f);
  const specs = extractSpecifiers(code);
  const resolved = specs.map(s => ({ spec: s, resolved: resolveSpecifier(s, f) })).filter(x => x.resolved);
  importsMap.set(f, resolved.map(r => r.resolved));
}

const entryCandidates = [];
const mainPath = path.normalize(path.join(srcRoot, 'main.tsx'));
const appPath = path.normalize(path.join(srcRoot, 'App.tsx'));
if(fs.existsSync(mainPath)) entryCandidates.push(mainPath);
if(fs.existsSync(appPath)) entryCandidates.push(appPath);
const indexHtml = path.join(projectRoot, 'index.html');
if(fs.existsSync(indexHtml)){
  const html = readFile(indexHtml);
  const m = html.match(/<script[^>]+src=["']([^"']+)["']/i);
  if(m){
    const scr = m[1];
    if(scr && scr.startsWith('/')){
      const cand = path.join(projectRoot, scr.replace(/^\//, ''));
      if(fs.existsSync(cand)) entryCandidates.push(path.normalize(cand));
    }
  }
}

const reachable = new Set();
const stack = [...entryCandidates];
while(stack.length){
  const cur = stack.pop();
  if(!cur) continue;
  if(reachable.has(cur)) continue;
  reachable.add(cur);
  const refs = importsMap.get(cur) || [];
  for(const r of refs){ if(!reachable.has(r)) stack.push(r); }
}

const unused = allFiles.filter(f => !reachable.has(f));

console.log(JSON.stringify({ entries: entryCandidates, totalSourceFiles: allFiles.length, reachable: Array.from(reachable), unused } , null, 2));
