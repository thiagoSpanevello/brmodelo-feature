import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import nearley from "nearley";
import grammar from "./grammar.js";
import SemanticInterpreter from "./interpreter";
import DiagramGeneratorLogical from "./diagramGenerator";
import { reverseToDSL } from "./reverseToDSL";

// autoria original da DSL (grammar/interpreter/diagramGenerator/reverseToDSL): Taila Schmidt
// esse painel React é novo, adaptado pra v2.0.0 no lugar do componente Angular "editorDSL"

interface DslPanelProps {
	editor: any; // ILogicEditor + shapeFactory/addColumnToTable/buildTablesJson (ver LogicEditor)
	visible: boolean;
	onToggleVisible: () => void;
	showFeedback: (message: string, showing: boolean, type?: "success" | "error" | "warning") => void;
}

const DEBOUNCE_MS = 800;

const DslPanel: React.FC<DslPanelProps> = ({ editor, visible, onToggleVisible, showFeedback }) => {
	const { t } = useTranslation(["common"]);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const myGrammarRef = useRef<any>(null);

	useEffect(() => {
		try {
			myGrammarRef.current = nearley.Grammar.fromCompiled(grammar);
		} catch (e: any) {
			console.error("Erro ao carregar o grammar da DSL:", e.message);
		}
	}, []);

	const formatSyntaxError = (err: any) => {
		if (err.token && err.token.line && err.token.col) {
			return `Erro de sintaxe na linha ${err.token.line} col ${err.token.col}: token inesperado "${err.token.text || err.token.value}"`;
		}
		return err.message || "Erro de sintaxe na DSL";
	};

	const runParse = useCallback((text: string) => {
		if (!editor || !myGrammarRef.current) return;

		try {
			const parser = new nearley.Parser(myGrammarRef.current, { lexer: myGrammarRef.current.lexer });
			parser.feed(text);
			if (!parser.results.length) {
				setError("DSL incompleta");
				return;
			}

			const interpreter = new SemanticInterpreter();
			const semanticResult = interpreter.execute(parser.results[0]);

			const generator = new DiagramGeneratorLogical(editor);
			generator.generate(semanticResult);

			setError(null);
			editor.setDirty?.(true);
		} catch (e: any) {
			setError(formatSyntaxError(e));
		}
	}, [editor]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = e.target.value;
		setCode(value);

		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => runParse(value), DEBOUNCE_MS);
	};

	const handleImportFromDiagram = () => {
		if (!editor) return;
		try {
			const dsl = reverseToDSL(editor);
			setCode(dsl);
			setError(null);
		} catch (e: any) {
			console.error(e);
			showFeedback("Failed to import diagram into DSL", true, "error");
		}
	};

	return (
		<section className={`elements-panel floatingPanel dsl-panel${visible ? " open" : ""}`} id="dsl-editor">
			<button
				type="button"
				className="toggle-visibility"
				aria-label="Toggle DSL panel"
				onClick={onToggleVisible}
			>
				DSL
			</button>

			{visible && (
				<div className="dsl-panel-content">
					<div className="dsl-panel-actions">
						<button type="button" className="br-button small" onClick={handleImportFromDiagram}>
							{t("Import from diagram")}
						</button>
					</div>
					<textarea
						value={code}
						onChange={handleChange}
						spellCheck={false}
						placeholder={"Table users {\n  id int [pk];\n  name varchar;\n}"}
					/>
					{error && <div className="dsl-panel-error">{error}</div>}
				</div>
			)}
		</section>
	);
};

export default DslPanel;
