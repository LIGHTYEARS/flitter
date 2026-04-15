import fs from 'fs';
import * as parser from '@babel/parser';

const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/extracted.js', 'utf-8');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const node1 = ast.program.body[6233];
console.log("Node 6233:");
console.log(code.substring(node1.start!, node1.start! + 200));

const node2 = ast.program.body[6232];
console.log("Node 6232:");
console.log(code.substring(node2.start!, node2.start! + 200));
