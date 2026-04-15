import fs from 'fs';
import path from 'path';
import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';

const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;

const sourceFile = '/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/modules/1472_tail_anonymous.js';
const targetDir = '/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/modules/1472_tui_components';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log(`Reading source file: ${sourceFile}`);
const code = fs.readFileSync(sourceFile, 'utf-8');

console.log('Parsing AST...');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const moduleGroups = {
  'data_structures': [], // Large arrays/objects (like Sk0, ix0, aria properties)
  'prototype_extensions': [], // *.prototype.* assignments
  'initialization_calls': [] // Random function calls like O0(), rR()
};

console.log('Traversing AST and extracting remaining nodes...');
const nodesToRemove = new Set();

traverse(ast, {
  Program(path) {
    const body = path.node.body;
    for (let i = 0; i < body.length; i++) {
      const stmt = body[i];
      
      // We only want to extract things that are relatively large or specific
      
      if (t.isExpressionStatement(stmt)) {
        if (t.isAssignmentExpression(stmt.expression)) {
          const left = stmt.expression.left;
          const right = stmt.expression.right;
          
          // Pattern: Something.prototype.property = ...
          if (t.isMemberExpression(left) && t.isIdentifier(left.property) && 
              t.isMemberExpression(left.object) && t.isIdentifier(left.object.property) && left.object.property.name === 'prototype') {
            moduleGroups['prototype_extensions'].push(stmt);
            nodesToRemove.add(stmt);
            continue;
          }
          
          // Large data structures (Arrays/Objects with many elements)
          if (t.isArrayExpression(right) && right.elements.length > 5) {
             moduleGroups['data_structures'].push(stmt);
             nodesToRemove.add(stmt);
             continue;
          }
          if (t.isObjectExpression(right) && right.properties.length > 10) {
             moduleGroups['data_structures'].push(stmt);
             nodesToRemove.add(stmt);
             continue;
          }
          
          // Large Set initializations
          if (t.isNewExpression(right) && t.isIdentifier(right.callee) && right.callee.name === 'Set') {
             moduleGroups['data_structures'].push(stmt);
             nodesToRemove.add(stmt);
             continue;
          }
        } 
        // Naked function calls like O0(); rR();
        else if (t.isCallExpression(stmt.expression) && t.isIdentifier(stmt.expression.callee)) {
           // We might want to group these or leave them as they are likely module init calls.
           // For now, let's leave them in the main file as they dictate execution order.
        }
      }
    }
  }
});

// Remove extracted nodes from original AST
traverse(ast, {
    Program(path) {
        path.node.body = path.node.body.filter(stmt => !nodesToRemove.has(stmt));
    }
});

console.log('Generating new module files...');

let originalFileComments = `// ----------------------------------------------------------------------------\n`;
originalFileComments += `// Phase 2 Split: Data Structures and Prototypes\n`;
originalFileComments += `// ----------------------------------------------------------------------------\n\n`;

for (const [groupName, nodes] of Object.entries(moduleGroups)) {
  if (nodes.length === 0) continue;
  
  const filename = `${groupName}.js`;
  const filepath = path.join(targetDir, filename);
  
  // If file exists, append to it, else create new
  let existingCode = '';
  if (fs.existsSync(filepath)) {
    existingCode = fs.readFileSync(filepath, 'utf-8') + '\n\n';
  }
  
  const program = t.program(nodes);
  const output = generate(program, { retainLines: false }).code;
  
  fs.writeFileSync(filepath, existingCode + output);
  console.log(`Generated/Updated: ${filepath} (${nodes.length} nodes)`);
  
  originalFileComments += `// Extracted ${nodes.length} nodes to: ./1472_tui_components/${filename}\n`;
}

// Update original file
console.log('Updating original file...');
const remainingCode = generate(ast, { retainLines: false }).code;

// Let's insert the new comments after the first block of comments
const codeLines = remainingCode.split('\n');
let insertIndex = 0;
for (let i = 0; i < codeLines.length; i++) {
  if (!codeLines[i].startsWith('//')) {
    insertIndex = i;
    break;
  }
}

codeLines.splice(insertIndex, 0, originalFileComments);
const finalOriginalCode = codeLines.join('\n');

fs.writeFileSync(sourceFile, finalOriginalCode);
console.log('Done!');
