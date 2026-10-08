import React, { useCallback, useEffect, useRef, useState } from "react";
import nearley from "nearley";
import grammar from "./grammar.js";
import SemanticAnalyzer from "./semanticAnalyzer";
import DiagramGenerator from "./diagramGenerator";

interface DslPanelProps {
	getEditor: () => any;
	visible: boolean;
	onToggleVisible: () => void;
}

const DEBOUNCE_MS = 800;
const PLACEHOLDER = "Collection Pessoa {\n  nome string [not null];\n}";

// Gramática compilada sob demanda e reaproveitada entre execuções
let cachedGrammar: any = null;
function getGrammar() {
	if (!cachedGrammar) cachedGrammar = nearley.Grammar.fromCompiled(grammar);
	return cachedGrammar;
}

// Roda o pipeline completo (parse -> semântica -> diagrama).
// Retorna a mensagem de erro, ou null se deu tudo certo.
function processDsl(text: string, editor: any): string | null {
	try {
		const g = getGrammar();
		const parser = new nearley.Parser(g, { lexer: g.lexer });
		parser.feed(text);

		if (!parser.results.length) return "DSL incompleta";

		const ast = new SemanticAnalyzer().execute(parser.results[0]);
		new DiagramGenerator(editor).generate(ast);
		editor.setDirty?.(true);

		return null;
	} catch (e: any) {
		return e.message;
	}
}

// Debounce de callback: só a última chamada dentro da janela de tempo executa
function useDebouncedCallback<A extends any[]>(fn: (...args: A) => void, delay: number) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latestFn = useRef(fn);
	latestFn.current = fn;

	return useCallback(
		(...args: A) => {
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(() => latestFn.current(...args), delay);
		},
		[delay]
	);
}

const DslPanel: React.FC<DslPanelProps> = ({ getEditor, visible, onToggleVisible }) => {
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);

	const applyDsl = useDebouncedCallback((text: string) => {
		const editor = getEditor();
		if (!editor) {
			setError("Editor ainda não carregou");
			return;
		}
		setError(processDsl(text, editor));
	}, DEBOUNCE_MS);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setCode(e.target.value);
		applyDsl(e.target.value);
	};

	return (
		<section className={`floatingPanel dsl-panel${visible ? " open" : ""}`} id="dsl-editor">
			<button type="button" className="toggle-visibility" aria-label="Toggle DSL panel" onClick={onToggleVisible}>
				DSL
			</button>

			{visible && (
				<div className="dsl-panel-content">
					<textarea value={code} onChange={handleChange} spellCheck={false} placeholder={PLACEHOLDER} />
					{error && <div className="dsl-panel-error">{error}</div>}
				</div>
			)}
		</section>
	);
};

export default DslPanel;