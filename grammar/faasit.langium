grammar Faasit

entry Module:
  imports+=Import*
  blocks+=Block*;

Import:
  'import' '(' url+=STRING+  ')';

Block:
  CustomBlock | BlockBlock | StructBlock | UseBlock | ServiceBlock;

StructBlock:
  'struct' name=ID '{' props+=Property* '}';

BlockBlock:
  'block' name=ID '{' props+=Property* '}';

UseBlock:
  'use' '{' props+=Property* '}';

ServiceBlock:
  'service' name=ID ('for' for_target=[Block:ID])? '{'
  methods=RpcDecl*
  '}';

RpcDecl:
  'rpc' name=ID(arg_type=StreamedType?) '->' streamed=('stream')? return_type=(StreamedType)
;

StreamedType:
  streamed='stream'? type=ID;

CustomBlock:
  '@' block_type=ID (name=ID)? ('for' for_target=[Block:ID])? '{'
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

QualifiedName:
  names+=ID ('.' names+=ID)*;

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
