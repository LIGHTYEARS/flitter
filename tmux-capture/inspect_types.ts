import fs from 'fs';
import * as parser from '@babel/parser';

const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/extracted.js', 'utf-8');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const topLevelNodes = ast.program.body;
let flattenedNodes: any[] = [];
for (const node of topLevelNodes) {
  let isD3R = false;
  if (node.type === 'VariableDeclaration' && node.declarations.length === 1) {
    const init = node.declarations[0].init;
    if (init && init.type === 'CallExpression' && init.callee.type === 'Identifier' && init.callee.name === 'D3R') {
      const arg = init.arguments[0];
      if (arg && (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression')) {
        if (arg.body.type === 'BlockStatement') {
          isD3R = true;
          flattenedNodes.push(...arg.body.body);
        }
      }
    }
  }
  if (!isD3R) flattenedNodes.push(node);
}

const typeCounts: Record<string, number> = {};
flattenedNodes.forEach(n => {
  typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
});

console.log("Node types distribution:");
console.table(typeCounts);

// Let's also check how many classes we have
const classNames = flattenedNodes
  .filter(n => n.type === 'ClassDeclaration' && n.id)
  .map(n => n.id.name);
console.log(`Found ${classNames.length} classes.`);
console.log("Some classes:", classNames.slice(0, 20).join(', '));

