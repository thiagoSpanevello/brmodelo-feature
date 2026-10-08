// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
function id(x) { return x[0]; }

import moo from "moo";

//tokens da DSL (terminais)
const rawLexer = moo.compile({
	WS:             { match: /\s+/, lineBreaks: true },
	STRING_LITERAL: /"(?:\\.|[^"\\])*"/,
	NUMBER:         /-?\d+\.\d+|-?\d+/,
	NOT_NULL:       /not\s+null/,
	ARROW:          "->",
	LBRACE:         "{",
	RBRACE:         "}",
	LBRACKET:       "[",
	RBRACKET:       "]",
	LPAREN:         "(",
	RPAREN:         ")",
	SEMI:           ";",
	COMMA:          ",",
	IDENTIFIER: {
		match: /[a-zA-Z_][a-zA-Z0-9_]*/,
		type: moo.keywords({
			COLLECTION:   "Collection",
			TYPE_STRING:  "string",
			TYPE_INT:     "int",
			TYPE_FLOAT:   "float",
			TYPE_BOOLEAN: "boolean",
			TYPE_DATE:    "date",
			UNIQUE:       "unique",
			DEFAULT:      "default",
			TRUE:         "true",
			FALSE:        "false",
		}),
	},
});

//ignora espaço em branco antes de chegar no parser
const lexer = {
	reset: (...args) => rawLexer.reset(...args),
	save: () => rawLexer.save(),
	formatError: (...args) => rawLexer.formatError(...args),
	has: (name) => rawLexer.has(name),
	next: () => {
		let tok;
		do { tok = rawLexer.next(); } while (tok && tok.type === "WS");
		return tok;
	},
};
let Lexer = lexer;
let ParserRules = [
    {"name": "main", "symbols": [], "postprocess": () => []},
    {"name": "main", "symbols": ["main", "collection_command"], "postprocess": ([list, c]) => [...list, c]},
    {"name": "collection_command", "symbols": [(lexer.has("COLLECTION") ? {type: "COLLECTION"} : COLLECTION), "identifier", (lexer.has("LBRACE") ? {type: "LBRACE"} : LBRACE), "field_list", (lexer.has("RBRACE") ? {type: "RBRACE"} : RBRACE)], "postprocess": ([, name, , fields]) => ({ name, fields })},
    {"name": "field_list", "symbols": ["field"], "postprocess": ([f]) => [f]},
    {"name": "field_list", "symbols": ["field_list", "field"], "postprocess": ([list, f]) => [...list, f]},
    {"name": "field", "symbols": ["simple_field"], "postprocess": id},
    {"name": "field", "symbols": ["embedded_field"], "postprocess": id},
    {"name": "field", "symbols": ["reference_field"], "postprocess": id},
    {"name": "simple_field", "symbols": ["identifier", "type", (lexer.has("SEMI") ? {type: "SEMI"} : SEMI)], "postprocess": ([name, type]) => ({ kind: "attribute", name, type, array: false, constraints: [] })},
    {"name": "simple_field", "symbols": ["identifier", "type", "arr", (lexer.has("SEMI") ? {type: "SEMI"} : SEMI)], "postprocess": ([name, type]) => ({ kind: "attribute", name, type, array: true, constraints: [] })},
    {"name": "simple_field", "symbols": ["identifier", "type", "constraints", (lexer.has("SEMI") ? {type: "SEMI"} : SEMI)], "postprocess": ([name, type, constraints]) => ({ kind: "attribute", name, type, array: false, constraints })},
    {"name": "simple_field", "symbols": ["identifier", "type", "arr", "constraints", (lexer.has("SEMI") ? {type: "SEMI"} : SEMI)], "postprocess": ([name, type, , constraints]) => ({ kind: "attribute", name, type, array: true, constraints })},
    {"name": "embedded_field", "symbols": ["identifier", (lexer.has("LBRACE") ? {type: "LBRACE"} : LBRACE), "field_list", (lexer.has("RBRACE") ? {type: "RBRACE"} : RBRACE), (lexer.has("SEMI") ? {type: "SEMI"} : SEMI)], "postprocess": ([name, , fields]) => ({ kind: "block", name, array: false, children: fields })},
    {"name": "embedded_field", "symbols": ["identifier", (lexer.has("LBRACE") ? {type: "LBRACE"} : LBRACE), "field_list", (lexer.has("RBRACE") ? {type: "RBRACE"} : RBRACE), "arr", (lexer.has("SEMI") ? {type: "SEMI"} : SEMI)], "postprocess": ([name, , fields]) => ({ kind: "block", name, array: true, children: fields })},
    {"name": "reference_field", "symbols": ["identifier", (lexer.has("ARROW") ? {type: "ARROW"} : ARROW), "identifier", (lexer.has("LBRACKET") ? {type: "LBRACKET"} : LBRACKET), "cardinality", (lexer.has("RBRACKET") ? {type: "RBRACKET"} : RBRACKET), (lexer.has("SEMI") ? {type: "SEMI"} : SEMI)], "postprocess": ([name, , ref, , card]) => ({ kind: "reference", name, ref, array: false, cardinality: card })},
    {"name": "reference_field", "symbols": ["identifier", (lexer.has("ARROW") ? {type: "ARROW"} : ARROW), "identifier", "arr", (lexer.has("LBRACKET") ? {type: "LBRACKET"} : LBRACKET), "cardinality", (lexer.has("RBRACKET") ? {type: "RBRACKET"} : RBRACKET), (lexer.has("SEMI") ? {type: "SEMI"} : SEMI)], "postprocess": ([name, , ref, , , card]) => ({ kind: "reference", name, ref, array: true, cardinality: card })},
    {"name": "arr", "symbols": [(lexer.has("LBRACKET") ? {type: "LBRACKET"} : LBRACKET), (lexer.has("RBRACKET") ? {type: "RBRACKET"} : RBRACKET)], "postprocess": () => true},
    {"name": "constraints", "symbols": [(lexer.has("LBRACKET") ? {type: "LBRACKET"} : LBRACKET), "constraint_list", (lexer.has("RBRACKET") ? {type: "RBRACKET"} : RBRACKET)], "postprocess": ([, list]) => list},
    {"name": "constraint_list", "symbols": ["constraint_item"], "postprocess": ([c]) => [c]},
    {"name": "constraint_list", "symbols": ["constraint_list", (lexer.has("COMMA") ? {type: "COMMA"} : COMMA), "constraint_item"], "postprocess": ([list, , c]) => [...list, c]},
    {"name": "constraint_item", "symbols": [(lexer.has("UNIQUE") ? {type: "UNIQUE"} : UNIQUE)], "postprocess": () => ({ type: "unique" })},
    {"name": "constraint_item", "symbols": [(lexer.has("NOT_NULL") ? {type: "NOT_NULL"} : NOT_NULL)], "postprocess": () => ({ type: "not_null" })},
    {"name": "constraint_item", "symbols": [(lexer.has("DEFAULT") ? {type: "DEFAULT"} : DEFAULT), (lexer.has("LPAREN") ? {type: "LPAREN"} : LPAREN), "value", (lexer.has("RPAREN") ? {type: "RPAREN"} : RPAREN)], "postprocess": ([, , v]) => ({ type: "default", value: v })},
    {"name": "cardinality", "symbols": [(lexer.has("STRING_LITERAL") ? {type: "STRING_LITERAL"} : STRING_LITERAL)], "postprocess": ([v]) => v.value.slice(1, -1)},
    {"name": "type", "symbols": [(lexer.has("TYPE_STRING") ? {type: "TYPE_STRING"} : TYPE_STRING)], "postprocess": () => "string"},
    {"name": "type", "symbols": [(lexer.has("TYPE_INT") ? {type: "TYPE_INT"} : TYPE_INT)], "postprocess": () => "int"},
    {"name": "type", "symbols": [(lexer.has("TYPE_FLOAT") ? {type: "TYPE_FLOAT"} : TYPE_FLOAT)], "postprocess": () => "float"},
    {"name": "type", "symbols": [(lexer.has("TYPE_BOOLEAN") ? {type: "TYPE_BOOLEAN"} : TYPE_BOOLEAN)], "postprocess": () => "boolean"},
    {"name": "type", "symbols": [(lexer.has("TYPE_DATE") ? {type: "TYPE_DATE"} : TYPE_DATE)], "postprocess": () => "date"},
    {"name": "value", "symbols": [(lexer.has("STRING_LITERAL") ? {type: "STRING_LITERAL"} : STRING_LITERAL)], "postprocess": ([v]) => v.value.slice(1, -1)},
    {"name": "value", "symbols": [(lexer.has("NUMBER") ? {type: "NUMBER"} : NUMBER)], "postprocess": ([v]) => Number(v.value)},
    {"name": "value", "symbols": [(lexer.has("TRUE") ? {type: "TRUE"} : TRUE)], "postprocess": () => true},
    {"name": "value", "symbols": [(lexer.has("FALSE") ? {type: "FALSE"} : FALSE)], "postprocess": () => false},
    {"name": "identifier", "symbols": [(lexer.has("IDENTIFIER") ? {type: "IDENTIFIER"} : IDENTIFIER)], "postprocess": ([v]) => v.value}
];
let ParserStart = "main";
export default { Lexer, ParserRules, ParserStart };
