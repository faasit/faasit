grammar Faasit

entry Module:
  imports+=Import*
  blocks+=Block*;

Import:
  'import' '(' url+=STRING+  ')';

Block:
  CustomBlock | CustomDeclBlock | StructBlock;

StructBlock:
  'struct' name=ID '{' props+=Property* '}';

CustomDeclBlock:
  'block' name=ID '{' props+=Property* '}';

CustomBlock:
  '@' block_type=[CustomDeclBlock:ID] (name=ID)? ('for' for_target=ID)? '{'
  props+=Property*
   '}';

Property:
  name=ID '=' value=Expr;

Expr:
  QualifiedName | Literal | ListExpr | TypeCallExpr | BlockExpr;

BlockExpr:
  '{' (props+=Property)* '}';

ListExpr:
  '[' (elements+=Expr (',' elements+=Expr)* ','?)? ']';

TypeCallExpr:
  QualifiedName '<' elements+=Expr (',' elements+=Expr)* '>';

Literal:
  value=STRING | value=INT | value=FLOAT | value=BOOL;

QualifiedName:
  name+=ID ('.' name+=ID)*;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal FLOAT returns number: /-?[0-9]+\.[0-9]*/;
terminal INT returns number: /-?[0-9]+/;
terminal BOOL returns boolean: 'true' | 'false';
terminal STRING returns string: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
