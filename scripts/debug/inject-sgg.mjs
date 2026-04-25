import fs from 'fs';

const dataServicePath = 'src/services/dataService.js';
let content = fs.readFileSync(dataServicePath, 'utf8');

const newSigunguList = fs.readFileSync('sigungu_full.js', 'utf8');

// Find start
const startIndex = content.indexOf('export const SIGUNGU_LIST = {');
if (startIndex === -1) {
  console.log("Could not find SIGUNGU_LIST");
  process.exit(1);
}

// Find matching end brace
let endIndex = startIndex;
let braceCount = 0;
let foundBrace = false;

for (let i = startIndex; i < content.length; i++) {
  if (content[i] === '{') {
    braceCount++;
    foundBrace = true;
  }
  if (content[i] === '}') {
    braceCount--;
  }
  if (foundBrace && braceCount === 0) {
    if (content[i+1] === ';') {
      endIndex = i + 2;
    } else {
      endIndex = i + 1;
    }
    break;
  }
}

const finalContent = content.substring(0, startIndex) + newSigunguList + content.substring(endIndex);

fs.writeFileSync(dataServicePath, finalContent);
console.log("Successfully injected SIGUNGU_LIST");
