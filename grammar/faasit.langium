grammar Faasit

entry Instance:
  imports+=Import*
  blocks+=Block*;

// Sema Types
interface SemaPackage {
  id: string
  symbols: NamedElement[]
}

// like int, string, bool, any (builtin)
interface SemaAtomicType {
}

type NamedElement = SemaPackage | CustomBlock | BlockBlock | StructBlock | ScalarBlock | Expr;

Import:
  'import' '(' url+=STRING+  ')';

Block:
  CustomBlock | BlockBlock | ShapeBlock | StructBlock | ScalarBlock | UseBlock | LibBlock;

ScalarBlock:
  'scalar' name=ID '{' '}';

StructBlock:
  'struct' name=ID '{' props+=Property* '}';

BlockBlock:
  'block' name=ID '{' props+=Property* '}';

ShapeBlock:
  'shape' name=ID '{' props+=Property* '}';

UseBlock:
  'use' '{' props+=Property* '}';

LibBlock:
  'lib' '{' props+=Property* '}';

CustomBlock:
  '@' block_type=QualifiedName (name=ID)? ('for' for_target=[CustomBlock:ID])? '{'
  props+=Property*
   '}';

Property:
  name=ID '=' value=Expr;

Expr:
  QualifiedName | Literal | ListExpr | TypeCallExpr | BlockExpr;

BlockExpr:
  '{' (props+=Property)* '}';

ListExpr:
  '[' (items+=Expr (',' items+=Expr)* ','?)? ']';

TypeCallExpr:
  callee=QualifiedName '<' elements+=Expr (',' elements+=Expr)* '>';

// use 'previous' trick to construct a reversed link list from given qualifed name
// like a1.b1.c1 => (c1 -> b1 -> a1 -> nullptr) => 3 QualifedName nodes
QualifiedName:
  element=[NamedElement:ID] (
    {infer QualifiedName.previous=current}
    ("." element=[NamedElement:ID])
  )*;

Literal:
  LiteralString | LiteralInt | LiteralFloat | LiteralBool;

LiteralString:
  value=STRING;

LiteralInt:
  value=INT;

LiteralBool:
  value=BOOL;

LiteralFloat:
  value=FLOAT;

hidden terminal WS: /\s+/;
terminal FLOAT returns number: /-?[0-9]+\.[0-9]*/;
terminal INT returns number: /-?[0-9]+/;
terminal BOOL returns boolean: 'true' | 'false';
terminal STRING returns string: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
