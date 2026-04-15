import fs from 'fs';
import * as parser from '@babel/parser';

const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/chunk-005.js', 'utf-8');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const nodes = ast.program.body;
const sizes = nodes.map((n, i) => ({
  index: i,
  type: n.type,
  size: n.end! - n.start!
})).sort((a, b) => b.size - a.size);

console.log("Top 5 largest nodes in chunk 5:");
for (let i = 0; i < 5; i++) {
  console.log(sizes[i]);
}
