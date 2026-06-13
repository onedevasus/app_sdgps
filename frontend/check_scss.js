const fs = require('fs');
const c = fs.readFileSync('./src/app/features/dashboard/organization-list/organization-list.component.scss', 'utf8');
let depth = 0;
let minDepth = 0;
for (let i = 0; i < c.length; i++) {
  if (c[i] === '{') depth++;
  if (c[i] === '}') depth--;
  if (depth < minDepth) minDepth = depth;
}
console.log('Final depth:', depth, 'Min depth:', minDepth);

// Find the line with extra brace
const lines = c.split('\n');
let d = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') d++;
    if (ch === '}') d--;
  }
  if (d < 0) {
    console.log('Brace imbalance at line', i+1, ':', line);
    break;
  }
}
if (d >= 0) console.log('No imbalance detected (final depth:', d, ')');
