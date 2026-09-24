import Column from "../Column";

// autoria original (Angular/jointjs antigo): Taila Schmidt
// adaptado aqui pra usar LogicFactory + LogicEditor.addColumnToTable (v2.0.0)

const CARD_MAP = {
	"0-0>": ["0,1", "0,n"],
	"0-1>": ["0,1", "1,n"],
	"1-0>": ["1,1", "0,n"],
	"1-1>": ["1,1", "1,n"],
	"<0-0": ["0,n", "0,1"],
	"<0-1": ["0,n", "1,1"],
	"<1-0": ["1,n", "0,1"],
	"<1-1": ["1,n", "1,1"],
	"1-1": ["1,1", "1,1"],
};

const formatCard = (card) => {
	const [a, b] = card.split(",");
	return `(${a}, ${b})`;
};

// no link novo, source = tabela referenciada (lado do pk), target = tabela com a fk
const labelsForCardinality = (code) => {
	const [leftCard, rightCard] = CARD_MAP[code] || ["1,1", "0,n"];
	return { source: formatCard(rightCard), target: formatCard(leftCard) };
};

class DiagramGeneratorLogical {
	constructor(editor) {
		this.editor = editor;
		this.tables = new Map();
		this.relations = [];

		if (!this.editor?.graph) {
			throw new Error("LogicEditor.graph não inicializado.");
		}
	}

	generate(ast) {
		this.editor.graph.clear();
		this.tables.clear();
		this.relations = [];

		const tableNodes = ast.tables || [];
		const relationNodes = ast.relations || [];

		// 1a passada: cria os shapes vazios (sem colunas), pra já existir o id de cada
		// tabela na hora de resolver as FKs na 2a passada
		tableNodes.forEach((node, index) => {
			const x = (index % 3) * 300 + 100;
			const y = Math.floor(index / 3) * 200 + 100;

			const table = this.editor.shapeFactory.createNewTable({
				position: { x, y },
				name: node.name || "Table",
			});

			this.editor.graph.addCell(table);
			this.tables.set(node.name, table);
		});

		// 2a passada: adiciona as colunas. addColumnToTable já cria o link de FK
		// com a cardinalidade certa quando column.FK é true
		tableNodes.forEach((node) => {
			const tableShape = this.tables.get(node.name);

			(node.columns || []).forEach((col) => {
				const colOptions = col.options ?? [];
				const cleanName = (col.name || "").replace(/:.*/g, "");
				const defaultOpt = colOptions.find((o) => o.startsWith("default "));
				const isFk = colOptions.some((o) => o.startsWith("fk")) || !!col.fkRef;

				const column = new Column({
					name: cleanName,
					type: (col.type ?? col.colType ?? "").toLowerCase(),
					PK: colOptions.includes("pk"),
					FK: isFk,
				});
				column.NOT_NULL = colOptions.includes("not_null");
				column.UNIQUE = colOptions.includes("unique");
				column.AUTO_INCREMENT = colOptions.includes("auto_increment") || colOptions.includes("ai");
				column.defaultValue = defaultOpt ? defaultOpt.replace(/^default\s+/, "").trim() : "";
				// obs: constraint "check" da DSL não tem campo correspondente no Column/logic.Table
				// atual, então não é aplicada visualmente (fica só implícita no texto da DSL).

				let linkLabels;
				if (isFk && col.fkRef && this.tables.has(col.fkRef)) {
					const refTable = this.tables.get(col.fkRef);
					column.tableOrigin = { idOrigin: refTable.id, idLink: "", idName: col.fkRef };

					const rel = relationNodes.find(
						(r) => r.table1 === node.name && r.table2 === col.fkRef && r.fkColumn === cleanName
					);
					linkLabels = labelsForCardinality(rel?.cardinality);
				}

				this.editor.addColumnToTable(tableShape, column, linkLabels);
			});
		});

		relationNodes.forEach((rel) => this.relations.push({ ...rel }));

		return {
			tables: Array.from(this.tables.values()),
			relations: this.relations,
		};
	}
}

export default DiagramGeneratorLogical;
