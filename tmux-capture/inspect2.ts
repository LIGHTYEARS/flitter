import fs from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

console.time('read');
const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/extracted.js', 'utf-8');
console.timeEnd('read');

console.time('parse');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});
console.timeEnd('parse');

console.log("Top level nodes:", ast.program.body.length);
