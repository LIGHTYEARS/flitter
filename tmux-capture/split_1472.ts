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

// We'll organize them into simple buckets
const moduleGroups = {
  'actions_intents': [],
  'text_rendering': [],
  'layout_widgets': [],
  'interactive_widgets': [],
  'jetbrains_wizard': [],
  'misc_utils': []
};

// Node classification logic
function classifyNode(nodeName, classMethods, classStrings) {
  const content = [nodeName, ...classMethods, ...classStrings].join(' ').toLowerCase();

  if (content.includes('jetbrains') || content.includes('plugin') || content.includes('ide')) {
    return 'jetbrains_wizard';
  }
  if (content.includes('intent') || content.includes('action') || content.includes('focus') || content.includes('shortcut')) {
    return 'actions_intents';
  }
  if (content.includes('text') || content.includes('cursor') || content.includes('selection') || content.includes('paragraph')) {
    return 'text_rendering';
  }
  if (content.includes('button') || content.includes('scroll') || content.includes('dropdown') || content.includes('select')) {
    return 'interactive_widgets';
  }
  if (content.includes('box') || content.includes('padding') || content.includes('margin') || content.includes('mediaquery') || content.includes('constraint')) {
    return 'layout_widgets';
  }

  return 'misc_utils';
}

console.log('Traversing AST and extracting nodes...');
const nodesToRemove = new Set();

// Just collect top level statements
traverse(ast, {
  Program(path) {
    const body = path.node.body;
    for (let i = 0; i < body.length; i++) {
      const stmt = body[i];
      let nodeName = null;
      let isClassAssignment = false;
      let methods = [];
      let strings = [];

      // Pattern: ClassName = class extends BaseClass {}
      if (t.isExpressionStatement(stmt) && t.isAssignmentExpression(stmt.expression) && t.isClassExpression(stmt.expression.right)) {
        if (t.isIdentifier(stmt.expression.left)) {
          nodeName = stmt.expression.left.name;
          isClassAssignment = true;
        }
      }
      // Pattern: class ClassName extends BaseClass {}
      else if (t.isClassDeclaration(stmt) && stmt.id) {
        nodeName = stmt.id.name;
        isClassAssignment = true;
      }

      // If it's a class-like structure, let's extract it
      if (isClassAssignment && nodeName) {
        // Traverse inner structure to get keywords
        const innerAst = t.isClassDeclaration(stmt) ? stmt : stmt.expression.right;
        if (innerAst.body && innerAst.body.body) {
          for (const member of innerAst.body.body) {
            if ((t.isClassMethod(member) || t.isClassProperty(member)) && t.isIdentifier(member.key)) {
              methods.push(member.key.name);
            }
          }
        }

        traverse(stmt, {
          noScope: true,
          StringLiteral(strPath) {
            if (strPath.node.value.length > 3) {
              strings.push(strPath.node.value);
            }
          }
        }, path.scope, path.state, path.parentPath);

        const groupName = classifyNode(nodeName, methods, strings);
        moduleGroups[groupName].push(stmt);
        nodesToRemove.add(stmt);
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
originalFileComments += `// Original file: 1472_tail_anonymous.js\n`;
originalFileComments += `// This file was automatically split into domain-specific modules.\n`;
originalFileComments += `// The extracted classes can now be found in the '1472_tui_components' directory.\n`;
originalFileComments += `// ----------------------------------------------------------------------------\n\n`;

for (const [groupName, nodes] of Object.entries(moduleGroups)) {
  if (nodes.length === 0) continue;

  const filename = `${groupName}.js`;
  const filepath = path.join(targetDir, filename);

  const program = t.program(nodes);
  const output = generate(program, { retainLines: false }).code;

  fs.writeFileSync(filepath, output);
  console.log(`Generated: ${filepath} (${nodes.length} classes)`);

  originalFileComments += `// Extracted ${nodes.length} classes to: ./1472_tui_components/${filename}\n`;
}

// Update original file
console.log('Updating original file...');
const remainingCode = generate(ast, { retainLines: false }).code;
const finalOriginalCode = originalFileComments + '\n' + remainingCode;

fs.writeFileSync(sourceFile, finalOriginalCode);
console.log('Done!');
