import fs from 'fs';
import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';

const traverse = _traverse.default || _traverse;

const filePath = '/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/modules/1472_tail_anonymous.js';
const code = fs.readFileSync(filePath, 'utf-8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const stats = {
  functions: 0,
  variables: 0,
  assignments: 0,
  calls: 0,
  others: 0
};

const topLevelNodes = [];

traverse(ast, {
  Program(path) {
    for (const stmt of path.node.body) {
      if (t.isFunctionDeclaration(stmt)) {
        stats.functions++;
        topLevelNodes.push({ type: 'Function', name: stmt.id?.name || 'anonymous', loc: stmt.loc });
      } else if (t.isVariableDeclaration(stmt)) {
        stats.variables += stmt.declarations.length;
        stmt.declarations.forEach(d => {
           topLevelNodes.push({ type: 'Variable', name: d.id.name || 'unknown', loc: stmt.loc });
        });
      } else if (t.isExpressionStatement(stmt)) {
        if (t.isAssignmentExpression(stmt.expression)) {
          stats.assignments++;
          let name = 'unknown';
          if (t.isIdentifier(stmt.expression.left)) name = stmt.expression.left.name;
          else if (t.isMemberExpression(stmt.expression.left)) name = 'MemberExpression';
          topLevelNodes.push({ type: 'Assignment', name, loc: stmt.loc });
        } else if (t.isCallExpression(stmt.expression)) {
          stats.calls++;
          let name = 'unknown';
          if (t.isIdentifier(stmt.expression.callee)) name = stmt.expression.callee.name;
          topLevelNodes.push({ type: 'Call', name, loc: stmt.loc });
        } else {
          stats.others++;
        }
      } else {
        stats.others++;
      }
    }
  }
});

console.log("=== AST Top-Level Statistics ===");
console.log(stats);

console.log("\n=== Top-Level Nodes (First 30) ===");
for (let i = 0; i < Math.min(30, topLevelNodes.length); i++) {
  const n = topLevelNodes[i];
  console.log(`[L${n.loc?.start.line}] ${n.type}: ${n.name}`);
}

console.log("\n=== Top-Level Nodes (Last 30) ===");
for (let i = Math.max(0, topLevelNodes.length - 30); i < topLevelNodes.length; i++) {
  const n = topLevelNodes[i];
  console.log(`[L${n.loc?.start.line}] ${n.type}: ${n.name}`);
}
