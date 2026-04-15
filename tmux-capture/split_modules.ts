import fs from 'fs';
import path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

const CHUNKS_DIR = '/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed';
const OUT_DIR = path.join(CHUNKS_DIR, 'modules');

if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(CHUNKS_DIR).filter(f => f.startsWith('chunk-') && f.endsWith('.js'));
let moduleIndex = 0;
const moduleMap: any[] = [];

for (const file of files) {
  console.log(`Processing ${file}...`);
  const code = fs.readFileSync(path.join(CHUNKS_DIR, file), 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  const body = ast.program.body;
  
  // Step 1: Pre-compute guesses for each top-level node
  const nodeGuesses = new Map<any, string>();
  
  for (const node of body) {
    if (node.type === 'ClassDeclaration' || node.type === 'FunctionDeclaration') {
      let guessedName: string | null = null;
      
      const findName = (n: any) => {
        if (guessedName) return;
        if (!n || typeof n !== 'object') return;
        
        // 1. `name: "SomeClass"`
        if (n.type === 'ObjectProperty' && n.key.type === 'Identifier' && n.key.name === 'name' && n.value.type === 'StringLiteral') {
          const val = n.value.value;
          if (/^[A-Z][a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*$/.test(val) && !val.includes(' ')) {
             guessedName = val.split('.')[0];
             return;
          }
        }
        
        // 2. Logging patterns: J.debug("SomeClass ...")
        if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.property.type === 'Identifier' && ['debug', 'info', 'error', 'warn'].includes(n.callee.property.name)) {
          const firstArg = n.arguments[0];
          if (firstArg && firstArg.type === 'StringLiteral') {
             // Look for PascalCase words that look like classes
             const match = firstArg.value.match(/([A-Z][a-z0-9]+[A-Z][a-zA-Z0-9]*)/);
             if (match) {
                guessedName = match[1];
                return;
             }
          }
        }
        
        for (const key in n) {
          if (Array.isArray(n[key])) {
            n[key].forEach(findName);
          } else if (typeof n[key] === 'object') {
            findName(n[key]);
          }
        }
      };
      
      findName(node);
      if (guessedName) {
        nodeGuesses.set(node, guessedName);
      }
    }
  }
  
  // Step 2: Split
  let currentBuffer: any[] = [];
  
  const flushBuffer = (anchorNode: any, nameHint: string | null) => {
    if (currentBuffer.length === 0) return;
    
    const newAst = {
      ...ast,
      program: {
        ...ast.program,
        body: currentBuffer
      }
    };
    
    // @ts-ignore
    const output = generate(newAst, {
      comments: true,
      minified: false,
      jsescOption: { minimal: true }
    });
    
    const safeName = nameHint ? nameHint.replace(/[^a-zA-Z0-9_]/g, '') : `unknown`;
    const mangledName = anchorNode?.id?.name || 'anonymous';
    const fileName = `${String(moduleIndex).padStart(4, '0')}_${safeName}_${mangledName}.js`;
    
    fs.writeFileSync(path.join(OUT_DIR, fileName), output.code);
    moduleMap.push({
      file: fileName,
      guessedName: nameHint,
      mangledName: mangledName,
      nodeType: anchorNode?.type || 'Mixed',
      nodesCount: currentBuffer.length
    });
    
    moduleIndex++;
    currentBuffer = [];
  };

  for (let i = 0; i < body.length; i++) {
    const node = body[i];
    currentBuffer.push(node);
    
    const isLargeFunction = node.type === 'FunctionDeclaration' && (node.end! - node.start! > 200);
    if (node.type === 'ClassDeclaration' || isLargeFunction) {
      const hint = nodeGuesses.get(node) || null;
      flushBuffer(node, hint);
    }
  }
  
  if (currentBuffer.length > 0) {
    flushBuffer(null, 'tail');
  }
}

fs.writeFileSync(path.join(CHUNKS_DIR, '_module-map.json'), JSON.stringify(moduleMap, null, 2));
console.log(`Generated ${moduleIndex} modules in ${OUT_DIR}`);
