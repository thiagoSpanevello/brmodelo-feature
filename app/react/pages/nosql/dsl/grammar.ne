@preprocessor esmodule

@{%
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

# ignora espaço em branco antes de chegar no parser
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
%}

@lexer lexer

//documento = zero ou mais collections
main -> null                      {% () => [] %}
      | main collection_command   {% ([list, c]) => [...list, c] %}

# Collection Nome { campos }
collection_command -> %COLLECTION identifier %LBRACE field_list %RBRACE
	{% ([, name, , fields]) => ({ name, fields }) %}

# um ou mais campos
field_list -> field               {% ([f]) => [f] %}
            | field_list field    {% ([list, f]) => [...list, f] %}

field -> simple_field    {% id %}
       | embedded_field  {% id %}
       | reference_field {% id %}

# nome tipo [constraints];
simple_field -> identifier type %SEMI
	{% ([name, type]) => ({ kind: "attribute", name, type, array: false, constraints: [] }) %}
	| identifier type arr %SEMI
	{% ([name, type]) => ({ kind: "attribute", name, type, array: true, constraints: [] }) %}
	| identifier type constraints %SEMI
	{% ([name, type, constraints]) => ({ kind: "attribute", name, type, array: false, constraints }) %}
	| identifier type arr constraints %SEMI
	{% ([name, type, , constraints]) => ({ kind: "attribute", name, type, array: true, constraints }) %}

# nome { campos };  (documento aninhado)
embedded_field -> identifier %LBRACE field_list %RBRACE %SEMI
	{% ([name, , fields]) => ({ kind: "block", name, array: false, children: fields }) %}
	| identifier %LBRACE field_list %RBRACE arr %SEMI
	{% ([name, , fields]) => ({ kind: "block", name, array: true, children: fields }) %}

# nome -> OutraCollection [cardinalidade];
reference_field -> identifier %ARROW identifier %LBRACKET cardinality %RBRACKET %SEMI
	{% ([name, , ref, , card]) => ({ kind: "reference", name, ref, array: false, cardinality: card }) %}
	| identifier %ARROW identifier arr %LBRACKET cardinality %RBRACKET %SEMI
	{% ([name, , ref, , , card]) => ({ kind: "reference", name, ref, array: true, cardinality: card }) %}

arr -> %LBRACKET %RBRACKET {% () => true %}

constraints -> %LBRACKET constraint_list %RBRACKET {% ([, list]) => list %}

constraint_list -> constraint_item                        {% ([c]) => [c] %}
                  | constraint_list %COMMA constraint_item {% ([list, , c]) => [...list, c] %}

constraint_item -> %UNIQUE                        {% () => ({ type: "unique" }) %}
                  | %NOT_NULL                      {% () => ({ type: "not_null" }) %}
                  | %DEFAULT %LPAREN value %RPAREN {% ([, , v]) => ({ type: "default", value: v }) %}

cardinality -> %STRING_LITERAL {% ([v]) => v.value.slice(1, -1) %}

type -> %TYPE_STRING  {% () => "string" %}
      | %TYPE_INT     {% () => "int" %}
      | %TYPE_FLOAT   {% () => "float" %}
      | %TYPE_BOOLEAN {% () => "boolean" %}
      | %TYPE_DATE    {% () => "date" %}

value -> %STRING_LITERAL {% ([v]) => v.value.slice(1, -1) %}
       | %NUMBER         {% ([v]) => Number(v.value) %}
       | %TRUE           {% () => true %}
       | %FALSE          {% () => false %}

identifier -> %IDENTIFIER {% ([v]) => v.value %}