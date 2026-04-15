import fs from 'fs';
import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import _generate from '@babel/generator';

const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;

const filePath = '/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/modules/1472_tail_anonymous.js';
const code = fs.readFileSync(filePath, 'utf-8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const remainingSizes = {
  functions: 0,
  functionsChars: 0,
  variables: 0,
  variablesChars: 0,
  assignments: 0,
  assignmentsChars: 0,
  calls: 0,
  callsChars: 0,
  others: 0,
  othersChars: 0,
};

let largeBlocks = [];

traverse(ast, {
  Program(path) {
    for (const stmt of path.node.body) {
      const codeString = generate(stmt, { retainLines: false }).code;
      const size = codeString.length;
      
      let type = 'Other';
      let name = 'unknown';
      
      if (t.isFunctionDeclaration(stmt)) {
        type = 'Function';
        name = stmt.id?.name || 'anonymous';
        remainingSizes.functions++;
        remainingSizes.functionsChars += size;
      } else if (t.isVariableDeclaration(stmt)) {
        type = 'Variable';
        name = stmt.declarations[0]?.id?.name || 'unknown';
        remainingSizes.variables += stmt.declarations.length;
        remainingSizes.variablesChars += size;
      } else if (t.isExpressionStatement(stmt)) {
        if (t.isAssignmentExpression(stmt.expression)) {
          type = 'Assignment';
          if (t.isIdentifier(stmt.expression.left)) name = stmt.expression.left.name;
          else if (t.isMemberExpression(stmt.expression.left)) name = 'MemberExpression';
          remainingSizes.assignments++;
          remainingSizes.assignmentsChars += size;
        } else if (t.isCallExpression(stmt.expression)) {
          type = 'Call';
          if (t.isIdentifier(stmt.expression.callee)) name = stmt.expression.callee.name;
          remainingSizes.calls++;
          remainingSizes.callsChars += size;
        } else {
          type = 'ExpressionOther';
          remainingSizes.others++;
          remainingSizes.othersChars += size;
        }
      } else {
        remainingSizes.others++;
        remainingSizes.othersChars += size;
      }
      
      if (size > 1000) {
        largeBlocks.push({
           type,
           name,
           size,
           loc: stmt.loc?.start.line || 0,
           preview: codeString.substring(0, 60).replace(/\n/g, ' ') + '...'
        });
      }
    }
  }
});

console.log("=== Remaining AST Block Statistics ===");
console.log(`Functions: ${remainingSizes.functions} (${Math.round(remainingSizes.functionsChars/1024)} KB)`);
console.log(`Variables: ${remainingSizes.variables} (${Math.round(remainingSizes.variablesChars/1024)} KB)`);
console.log(`Assignments: ${remainingSizes.assignments} (${Math.round(remainingSizes.assignmentsChars/1024)} KB)`);
console.log(`Calls: ${remainingSizes.calls} (${Math.round(remainingSizes.callsChars/1024)} KB)`);
console.log(`Others: ${remainingSizes.others} (${Math.round(remainingSizes.othersChars/1024)} KB)`);

console.log("\n=== Large Blocks (>1KB) ===");
largeBlocks.sort((a, b) => b.size - a.size);
for (const block of largeBlocks.slice(0, 15)) {
   console.log(`[L${block.loc}] ${block.type} '${block.name}': ${Math.round(block.size/1024)} KB -> ${block.preview}`);
}
