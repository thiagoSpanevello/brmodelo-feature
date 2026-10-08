import link from "../../../../joint/link";

class DiagramGenerator {
    constructor(editor){
        this.editor = editor;
        this.collections = new Map();

        if(!this.editor?.graph){
            throw new Error("Editor is not initialized");
        }
    }

    generate(ast){
        this.editor.graph.clear();
		this.collections.clear();

        ast.forEach((node, index) => {
			const x = (index % 3) * 300 + 100;
			const y = Math.floor(index / 3) * 220 + 100;

			const shape = this.editor.shapeFactory.createCollection({ position: { x, y }, name: node.name });
			/* o editor adiciona o _id sozinho quando a collection entra no grafo (evento 'add') */
			this.editor.graph.addCell(shape);
			this.collections.set(node.name, shape);
		});
        ast.forEach((node) => {
			this.addFields(this.collections.get(node.name), node.fields, []);
		});

		return Array.from(this.collections.values());
    }

    addFields(shape, fields, path) {
		fields.forEach((field) => {
			if (field.kind === "attribute") {
				shape.addRow(path, {
					kind: "attribute",
					name: field.name,
					type: field.type,
					...this.arrayCardinality(field),
					...this.constraintProps(field),
				});
			} else if (field.kind === "block") {
				/* addRow devolve o índice onde o bloco ficou, que vira parte do path dos filhos */
				const index = shape.addRow(path, {
					kind: "block",
					name: field.name,
					...this.arrayCardinality(field),
				});
				this.addFields(shape, field.children, [...path, index]);
			} else if (field.kind === "reference") {
				this.addReference(shape, field, path);
			}
		});
	}

    addReference(shape, field, path) {
		const target = this.collections.get(field.ref);

		/* source = collection referenciada, target = collection que recebe o campo (mesmo sentido do link criado na sidebar) */
		const myLink = new link({ source: { id: target.id }, target: { id: shape.id } });
		this.editor.graph.addCell(myLink);

		shape.addRow(path, {
			kind: "reference",
			name: field.name,
			type: target.getIdentifierType ? target.getIdentifierType() : "ID",
			isReference: true,
			targetCollectionId: target.id,
			targetCollectionName: field.ref,
			linkId: myLink.id,
		});
	}

    arrayCardinality(field) {
		if (!field.array) return {};
		return { cardinalityEnabled: true, minCardinality: 0, maxCardinality: "N" };
	}

	constraintProps(field){
		const props = {};
		field.constraints.forEach((c) =>{
			if(c.type === "not_null") props.notNull = true;
			if(c.type === "unique") props.unique = true;
			if(c.type === "default") props.defaultValue = c.value;
		});
		return props;
	}
}

export default DiagramGenerator;