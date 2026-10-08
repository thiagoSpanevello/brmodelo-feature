/* Mapeia o tipo da DSL pro tipo correspondente no JS, pq se o tipo do campo for
date e o default vier como string, o JS entende normalmente como string mesmo */
const JS_TYPE_BY_FIELD_TYPE = {
	string: "string",
	date: "string",
	int: "number",
	float: "number",
	boolean: "boolean",
};

function isValidDate(value) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;

	const [, year, month, day] = match.map(Number);
	if (month < 1 || month > 12) return false;

	const daysInMonth = new Date(year, month, 0).getDate();
	return day >= 1 && day <= daysInMonth;
}

export default class SemanticAnalyzer {
	constructor() {
		this.collections = [];
	}

	execute(ast) {
		this.collections = [];

		/* primeira passada registra todas as collections para poder validar as referencias,
		pq a primeira pode dar ref na ultima collection do arquivo
		*/
		const names = ast.map((c) => c.name);
		for (const node of ast) {
			this.checkCollection(node, names);
		}
		return this.collections;
	}

	checkCollection(node, allCollectionNames) {
		if (this.collections.find((c) => c.name === node.name)) {
			throw Error(`Collection '${node.name}' is already defined`);
		}
		const fields = this.checkFields(node.fields, node.name, allCollectionNames, new Set());
		this.collections.push({ name: node.name, fields });
	}

	checkFields(fields, collectionName, allCollectionNames, seenNames) {
		return fields.map((field) => {
			if (seenNames.has(field.name)) {
				throw Error(`Field '${field.name}' is already defined in collection '${collectionName}'`);
			}
			seenNames.add(field.name);

			if (field.kind === "block") {
				return {
					...field,
					children: this.checkFields(field.children, collectionName, allCollectionNames, new Set()),
				};
			}
			if (field.kind === "reference") {
				this.checkReferenceField(field, collectionName, allCollectionNames);
			}
			if (field.kind === "attribute") {
				this.checkConstraints(field);
			}
			return field;
		});
	}

	checkReferenceField(field, collectionName, allCollectionNames) {
		if (field.ref === collectionName) {
			throw Error(`Field '${field.name}' in collection '${collectionName}' cannot reference its own collection`);
		}
		if (!allCollectionNames.includes(field.ref)) {
			throw Error(`Reference field '${field.name}' in collection '${collectionName}' refers to an undefined collection '${field.ref}'`);
		}
		const validCardinalities = ["1-1", "1-N", "N-1", "N-N"];
		if (!validCardinalities.includes(field.cardinality)) {
			throw Error(`Reference field '${field.name}' in collection '${collectionName}' has invalid cardinality '${field.cardinality}'. Valid cardinalities are: ${validCardinalities.join(", ")}`);
		}
	}

	checkConstraints(field) {
		const defaultConstraint = field.constraints.find((c) => c.type === "default");
		if (!defaultConstraint) return;

		const expectedType = JS_TYPE_BY_FIELD_TYPE[field.type];
		const actualType = typeof defaultConstraint.value;

		if (actualType !== expectedType) {
			throw Error(`Field '${field.name}' has type '${field.type}' but default value '${defaultConstraint.value}' is of type '${actualType}'`);
		}

		if (field.type === "int" && !Number.isInteger(defaultConstraint.value)) {
			throw Error(`Field '${field.name}' is of type 'int' but default value '${defaultConstraint.value}' is not an integer`);
		}

		if (field.type === "date" && !isValidDate(defaultConstraint.value)) {
			throw Error(`Field '${field.name}' is of type 'date' but default value '${defaultConstraint.value}' is not a valid date (expected format: YYYY-MM-DD)`);
		}
	}
}