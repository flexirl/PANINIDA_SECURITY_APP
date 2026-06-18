const fs = require('fs');
const glob = require('glob');

const files = glob.sync('c:/Users/KIIT/Desktop/PAN_INDIA_SECURITY/mobile/src/**/*.tsx');
let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  // Replace backgroundColor={...} or backgroundColor="..." with backgroundColor="transparent" inside <StatusBar ... />
  content = content.replace(/(<StatusBar[^>]+)backgroundColor=(?:{[^}]+}|"[^"]+")([^>]*\/>)/g, (match, p1, p2) => {
    changed = true;
    return p1 + 'backgroundColor="transparent"' + p2;
  });
  if (changed) {
    fs.writeFileSync(file, content);
    count++;
  }
});
console.log('Updated ' + count + ' files with backgroundColor="transparent"');
