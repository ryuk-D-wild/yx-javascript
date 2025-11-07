const fs = require('fs');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'unused.json'),'utf8'));
const unused = data.unused || [];
if(unused.length === 0){ console.log('NO_UNUSED'); process.exit(0); }
const removedDir = path.join(projectRoot, 'removed-unused');
if(!fs.existsSync(removedDir)) fs.mkdirSync(removedDir);
for(const u of unused){
  const rel = path.relative(projectRoot, u);
  if(fs.existsSync(u)){
    const destName = rel.replace(/[\\/]/g, '_');
    const dest = path.join(removedDir, destName);
    fs.renameSync(u, dest);
    console.log('MOVED', rel);
  } else {
    console.log('NOT_FOUND', rel);
  }
}
