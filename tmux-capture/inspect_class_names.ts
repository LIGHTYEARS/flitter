import fs from 'fs';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

const code = fs.readFileSync('/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/chunk-002.js', 'utf-8');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

traverse(ast, {
  ClassDeclaration(path) {
    let internalName = null;
    path.traverse({
      ObjectProperty(propPath) {
        if (propPath.node.key.type === 'Identifier' && propPath.node.key.name === 'name') {
          if (propPath.node.value.type === 'StringLiteral') {
            internalName = propPath.node.value.value;
            propPath.stop();
          }
        }
      },
      StringLiteral(strPath) {
         if (!internalName && strPath.node.value.length > 5 && strPath.node.value.match(/^[A-Z][a-zA-Z0-9]+$/)) {
            // maybe a class name in a string
         }
      }
    });
    console.log(`Class ${path.node.id?.name} -> Guessed Name: ${internalName}`);
  }
});
