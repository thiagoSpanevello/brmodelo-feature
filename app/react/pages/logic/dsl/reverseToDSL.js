// autoria original (Angular/jointjs antigo): Taila Schmidt
// adaptado aqui pra ler o grafo via LogicEditor.buildTablesJson()/editor.graph (v2.0.0)

export function reverseToDSL(editor) {
	const model = editor.buildTablesJson();
	const graphLinks = editor.graph.getLinks();

	// mapeia constraints de colunas para strings da DSL
	function cToString(constraint) {
		if (constraint.type === "fk") {
			return constraint.ref ? `fk -> ${constraint.ref}` : "fk";
		}
		switch (constraint.type) {
			case "pk": return "pk";
			case "unique": return "unique";
			case "not_null": return "not null";
			case "auto_increment": return "auto increment";
			case "default": return "default " + constraint.value;
			case "check": return "check " + constraint.value;
			default: return "";
		}
	}

	function generateTableCode(table) {
		const attrs = table.columns.map((a) => {
			const type = a.type ? a.type.toLowerCase() : "";
			const cleanName = a.name.replace(/:.*/g, "");
			const cons = (a.constraints || []).map((c) => cToString(c)).join(", ");
			return `  ${cleanName} ${type}${cons ? " [" + cons + "]" : ""};`;
		}).join("\n");
		return `Table ${table.name} {\n${attrs} \n}`;
	}

	function generateRelationCode(rel) {
		const fk = rel.fkColumn.replace(/:.*/g, "");
		const pk = rel.pkColumn.replace(/:.*/g, "");
		const card = rel.cardinality || "<1-0";
		return `Relation ${rel.table1}(${fk}) ${card} ${rel.table2}(${pk});`;
	}

	// no link novo, source = tabela referenciada (lado do pk), target = tabela com a fk
	function findCardinalityFromLinks(tableName1, tableName2) {
		const clean = (s) => (s || "").replace(/[()]/g, "").replace(/\s/g, "").toLowerCase();

		for (const link of graphLinks) {
			const srcId = link.get("source")?.id;
			const tgtId = link.get("target")?.id;
			const srcName = model.get(srcId)?.name;
			const tgtName = model.get(tgtId)?.name;
			if (!srcName || !tgtName) continue;

			const forward = srcName === tableName2 && tgtName === tableName1;
			const reverse = srcName === tableName1 && tgtName === tableName2;
			if (!forward && !reverse) continue;

			const meta = link.get("cardinality");
			if (meta) return meta;

			const labels = link.get("labels") || [];
			const cardAtSource = clean(labels[0]?.attrs?.text?.text);
			const cardAtTarget = clean(labels[1]?.attrs?.text?.text);

			const leftCard = forward ? cardAtTarget : cardAtSource;   // perto de tableName1 (fk)
			const rightCard = forward ? cardAtSource : cardAtTarget;  // perto de tableName2 (pk)

			let card = "1-0>";
			if (leftCard === "0,1" && rightCard === "0,n") card = "0-0>";
			else if (leftCard === "0,1" && rightCard === "1,n") card = "0-1>";
			else if (leftCard === "1,1" && rightCard === "0,n") card = "1-0>";
			else if (leftCard === "1,1" && rightCard === "1,n") card = "1-1>";
			else if (leftCard === "0,n" && rightCard === "0,1") card = "<0-0";
			else if (leftCard === "1,n" && rightCard === "0,1") card = "<0-1";
			else if (leftCard === "0,n" && rightCard === "1,1") card = "<1-0";
			else if (leftCard === "1,n" && rightCard === "1,1") card = "<1-1";
			else if (leftCard === "1,1" && rightCard === "1,1") card = "1-1";
			return card;
		}
		return null;
	}

	function colConstraints(col) {
		const arr = [];
		if (col.PK) arr.push({ type: "pk" });
		if (col.FK) {
			const refName = col.tableOrigin?.idOrigin ? model.get(col.tableOrigin.idOrigin)?.name : null;
			if (refName) arr.push({ type: "fk", ref: refName });
		}
		if (col.UNIQUE) arr.push({ type: "unique" });
		if (col.NOT_NULL) arr.push({ type: "not_null" });
		if (col.AUTO_INCREMENT) arr.push({ type: "auto_increment" });
		if (col.defaultValue) arr.push({ type: "default", value: col.defaultValue });
		return arr;
	}

	const dslAst = [];
	model.forEach((table) => {
		dslAst.push({
			type: "table",
			name: table.name,
			columns: table.columns.map((col) => ({
				name: col.name,
				type: col.type,
				constraints: colConstraints(col),
			})),
		});
	});

	const relations = [];
	model.forEach((table) => {
		table.columns.forEach((col) => {
			if (!col.FK || !col.tableOrigin?.idOrigin) return;
			const refTable = model.get(col.tableOrigin.idOrigin);
			if (!refTable) return;

			const pkCol = refTable.columns.find((c) => c.PK)?.name || "id";
			const cardinality = findCardinalityFromLinks(table.name, refTable.name) || "<1-0";

			relations.push({
				type: "relation",
				table1: table.name,
				fkColumn: col.name,
				table2: refTable.name,
				pkColumn: pkCol,
				cardinality,
			});
		});
	});
	relations.forEach((rel) => dslAst.push(rel));

	return dslAst.map((node) => {
		if (node.type === "table") return generateTableCode(node);
		if (node.type === "relation") return generateRelationCode(node);
		return "";
	}).join("\n\n");
}
