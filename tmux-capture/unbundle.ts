import fs from 'fs';
import * as parser from '@babel/parser';
import generate from '@babel/generator';

console.log("Reading extracted.js...");
const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/extracted.js', 'utf-8');

const outDir = '/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log("Parsing bundle...");
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const topLevelNodes = ast.program.body;

// Flatten D3R wrappers
const flattenedNodes: any[] = [];
for (const node of topLevelNodes) {
  let isD3R = false;
  if (node.type === 'VariableDeclaration' && node.declarations.length === 1) {
    const init = node.declarations[0].init;
    if (init && init.type === 'CallExpression' && init.callee.type === 'Identifier' && init.callee.name === 'D3R') {
      const arg = init.arguments[0];
      if (arg && (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression')) {
        if (arg.body.type === 'BlockStatement') {
          isD3R = true;
          // Add a comment to indicate start of D3R
          flattenedNodes.push({
            type: 'EmptyStatement',
            leadingComments: [{ type: 'Line', value: ` Flattened D3R Wrapper: ${node.declarations[0].id.name}` }]
          });
          // Push all nodes inside the block
          flattenedNodes.push(...arg.body.body);
          flattenedNodes.push({
            type: 'EmptyStatement',
            leadingComments: [{ type: 'Line', value: ` End of D3R Wrapper: ${node.declarations[0].id.name}` }]
          });
        }
      }
    }
  }
  if (!isD3R) {
    flattenedNodes.push(node);
  }
}

console.log(`Bundle flattened from ${topLevelNodes.length} to ${flattenedNodes.length} top-level nodes.`);

const CHUNK_SIZE = 1500;
for (let i = 0; i < flattenedNodes.length; i += CHUNK_SIZE) {
  const chunkNodes = flattenedNodes.slice(i, i + CHUNK_SIZE);
  const chunkAst = {
    ...ast,
    program: {
      ...ast.program,
      body: chunkNodes
    }
  };

  // @ts-ignore
  const output = generate(chunkAst, {
    comments: true,
    minified: false,
    jsescOption: {
      minimal: true
    }
  });

  const chunkFileName = `${outDir}/chunk-${String(Math.floor(i / CHUNK_SIZE) + 1).padStart(3, '0')}.js`;
  fs.writeFileSync(chunkFileName, output.code);
  console.log(`Written ${chunkFileName} (${chunkNodes.length} nodes)`);
}

console.log("Unbundling and formatting complete.");
