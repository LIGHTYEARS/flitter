import fs from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/chunk-005.js', 'utf-8');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const decls = new Map<string, string>();
const refs = new Map<string, Set<string>>();

for (const node of ast.program.body) {
  if (node.type === 'ClassDeclaration' && node.id) {
    console.log("Class:", node.id.name);
  }
}
