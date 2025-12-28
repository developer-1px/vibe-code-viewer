import * as ts from 'typescript';

const code = 'export interface CodeLine { num: number; }';
const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);

function visit(node: ts.Node, depth = 0) {
  const indent = '  '.repeat(depth);
  const kind = ts.SyntaxKind[node.kind];
  const text = node.getText ? node.getText(sourceFile) : '';
  
  console.log(`${indent}${kind} (${node.kind}): "${text.slice(0, 50)}"`);
  
  // Check if it's in keyword range
  if (node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword) {
    console.log(`${indent}  ✅ IS KEYWORD`);
  }
  
  ts.forEachChild(node, child => visit(child, depth + 1));
}

console.log('=== AST Structure ===');
visit(sourceFile);

console.log('\n=== Keyword Range ===');
console.log('FirstKeyword:', ts.SyntaxKind.FirstKeyword, ts.SyntaxKind[ts.SyntaxKind.FirstKeyword]);
console.log('LastKeyword:', ts.SyntaxKind.LastKeyword, ts.SyntaxKind[ts.SyntaxKind.LastKeyword]);
console.log('InterfaceKeyword:', ts.SyntaxKind.InterfaceKeyword);
console.log('Is InterfaceKeyword in range?', ts.SyntaxKind.InterfaceKeyword >= ts.SyntaxKind.FirstKeyword && ts.SyntaxKind.InterfaceKeyword <= ts.SyntaxKind.LastKeyword);
