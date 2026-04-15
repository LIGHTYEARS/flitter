import fs from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/extracted.js', 'utf-8');

console.log("Parsing...");
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

console.log("Traversing...");
let count = 0;
let names: string[] = [];

traverse(ast, {
  VariableDeclarator(path) {
    const { id, init } = path.node;
    if (init && init.type === 'CallExpression') {
      if (init.callee.type === 'Identifier' && init.callee.name === 'EW') {
        count++;
        if (id.type === 'Identifier') {
          if (names.length < 20) {
             const bodyStr = code.substring(init.start!, init.end!);
             names.push(`${id.name} - length: ${bodyStr.length}`);
          }
        }
      }
    }
  }
});

console.log(`Found ${count} EW calls`);
console.log("First 20:", names);
