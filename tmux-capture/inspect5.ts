import fs from 'fs';
import * as parser from '@babel/parser';

const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/extracted.js', 'utf-8');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const node1 = ast.program.body[6233];
// @ts-ignore
const body = node1.declarations[0].init.arguments[0].body.body;
console.log(`Node 6233 has ${body.length} statements inside its arrow function.`);

