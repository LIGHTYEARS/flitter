import fs from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/chunk-001.js', 'utf-8');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

let ewCount = 0;
let otherTopLevel = 0;
const types = new Map<string, number>();

for (const node of ast.program.body) {
  types.set(node.type, (types.get(node.type) || 0) + 1);
  if (node.type === 'VariableDeclaration') {
    for (const decl of node.declarations) {
      if (decl.init && decl.init.type === 'CallExpression' && decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'EW') {
        ewCount++;
      }
    }
  }
}

console.log("Chunk 001 Stats:");
console.log("EW Wrappers:", ewCount);
console.log("Top level node types:", Object.fromEntries(types));

// Check chunk 005
const code5 = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/chunk-005.js', 'utf-8');
const ast5 = parser.parse(code5, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

let ewCount5 = 0;
const types5 = new Map<string, number>();
for (const node of ast5.program.body) {
  types5.set(node.type, (types5.get(node.type) || 0) + 1);
  if (node.type === 'VariableDeclaration') {
    for (const decl of node.declarations) {
      if (decl.init && decl.init.type === 'CallExpression' && decl.init.callee.type === 'Identifier' && decl.init.callee.name === 'EW') {
        ewCount5++;
      }
    }
  }
}
console.log("Chunk 005 Stats:");
console.log("EW Wrappers:", ewCount5);
console.log("Top level node types:", Object.fromEntries(types5));

