 /* Lê as collections do diagrama e monta o texto da DSL.
   Constraints (not null, unique, default) ainda não existem no diagrama, então não saem aqui. */

const INDENT = "    ";
/* o diagrama não guarda a cardinalidade da referência; a gramática exige uma, então vai um padrão */
const DEFAULT_REFERENCE_CARDINALITY = "N-1";

export function diagramToDSL(editor) {
	const collections = editor.graph.getElements().filter((el) => el.get("type") === "nosql.Collection");
	const nameById = new Map(collections.map((c) => [c.id, c.getName()]));

	return collections.map((c) => collectionToDSL(c, nameById)).join("\n\n");
}

function collectionToDSL(collection, nameById) {
	/* o _id é criado sozinho pelo editor, não faz parte da DSL */
	const rows = collection.getRows().filter((row) => !(row.kind === "attribute" && row.identifier));
	const fields = rows.map((row) => fieldToDSL(row, 1, nameById));

	return `Collection ${collection.getName()} {\n${fields.join("\n")}\n}`;
}

function fieldToDSL(row, level, nameById) {
	const pad = INDENT.repeat(level);
	const arr = isArray(row) ? " []" : "";

	if (row.kind === "block") {
		const children = (row.children || []).map((child) => fieldToDSL(child, level + 1, nameById));
		return `${pad}${row.name} {\n${children.join("\n")}\n${pad}}${arr};`;
	}

	if (row.kind === "reference") {
		const target = nameById.get(row.targetCollectionId) ?? row.targetCollectionName;
		return `${pad}${row.name} -> ${target} ["${DEFAULT_REFERENCE_CARDINALITY}"];`;
	}

	return `${pad}${row.name} ${row.type}${arr};`;
}

/* "[]" na DSL = cardinalidade com máximo N (ou maior que 1) */
function isArray(row) {
	if (!row.cardinalityEnabled) return false;
	return row.maxCardinality === "N" || Number(row.maxCardinality) > 1;
}