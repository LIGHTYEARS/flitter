import fs from 'fs';
import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';

// Deal with commonjs interop for babel traverse
const traverse = _traverse.default || _traverse;

const filePath = '/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/modules/1472_tail_anonymous.js';
const code = fs.readFileSync(filePath, 'utf-8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

interface ClassInfo {
  name: string;
  baseClass: string | null;
  methods: string[];
  strings: string[];
  startLine: number;
  endLine: number;
}

const classes: ClassInfo[] = [];

traverse(ast, {
  Class(path) {
    let name = 'Anonymous';
    
    // 1. class ClassName {}
    if (path.node.id && path.node.id.name) {
      name = path.node.id.name;
    } 
    // 2. ClassName = class {}
    else if (path.parentPath.isAssignmentExpression() && path.parentPath.node.left.type === 'Identifier') {
      name = path.parentPath.node.left.name;
    }
    // 3. const ClassName = class {}
    else if (path.parentPath.isVariableDeclarator() && path.parentPath.node.id.type === 'Identifier') {
      name = path.parentPath.node.id.name;
    }

    let baseClass = null;
    if (path.node.superClass) {
      if (path.node.superClass.type === 'Identifier') {
        baseClass = path.node.superClass.name;
      } else if (path.node.superClass.type === 'MemberExpression') {
        // e.g. React.Component
        baseClass = 'MemberExpression';
      }
    }

    const methods: string[] = [];
    const strings: string[] = [];

    path.traverse({
      ClassMethod(methodPath) {
        if (methodPath.node.key.type === 'Identifier') {
          methods.push(methodPath.node.key.name);
        }
      },
      ClassProperty(propPath) {
        if (propPath.node.key.type === 'Identifier') {
          methods.push(propPath.node.key.name);
        }
      },
      StringLiteral(strPath) {
        if (strPath.node.value.length > 5) {
          strings.push(strPath.node.value);
        }
      }
    });

    classes.push({
      name,
      baseClass,
      methods: Array.from(new Set(methods)),
      strings: Array.from(new Set(strings)).slice(0, 3), // keep it short
      startLine: path.node.loc?.start.line || 0,
      endLine: path.node.loc?.end.line || 0
    });
  }
});

// Grouping by Base Class to see the structure
const byBaseClass: Record<string, ClassInfo[]> = {};
for (const cls of classes) {
  const base = cls.baseClass || 'NoBase';
  if (!byBaseClass[base]) byBaseClass[base] = [];
  byBaseClass[base].push(cls);
}

console.log(`Total classes found: ${classes.length}\n`);

for (const [base, clss] of Object.entries(byBaseClass)) {
  console.log(`=== Extends ${base} (${clss.length} classes) ===`);
  // print first 5 as examples
  for (const cls of clss.slice(0, 5)) {
    console.log(`  - ${cls.name} [L${cls.startLine}-L${cls.endLine}]`);
    if (cls.methods.length) console.log(`      Methods: ${cls.methods.slice(0, 5).join(', ')}...`);
    if (cls.strings.length) console.log(`      Strings: ${cls.strings.join(' | ')}`);
  }
  if (clss.length > 5) {
    console.log(`  ... and ${clss.length - 5} more`);
  }
  console.log();
}

// Check other significant top-level variables or functions
let topLevelCount = 0;
traverse(ast, {
  Program(path) {
    for (const stmt of path.node.body) {
      if (stmt.type === 'VariableDeclaration') {
        topLevelCount += stmt.declarations.length;
      } else if (stmt.type === 'FunctionDeclaration') {
        topLevelCount++;
      } else if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
        topLevelCount++;
      }
    }
  }
});

console.log(`Top level declarations/assignments count: ${topLevelCount}`);
