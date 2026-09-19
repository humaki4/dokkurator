```js
const Ajv = require("ajv");
const YAML = require("yaml");

// 1. Instanziierung von Ajv
const ajv = new Ajv();

// 2. Definition des JSON-Schemas
const schema = {
  type: "object",
  properties: {
    apiVersion: { type: "string" },
    metadata: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
    spec: {
      type: "object",
      properties: {
        replicas: { type: "integer", minimum: 1 },
      },
      required: ["replicas"],
    },
  },
  required: ["apiVersion", "metadata", "spec"],
  additionalProperties: false,
};

// 3. Ein typischer YAML-String (z. B. aus einer Datei gelesen)
const yamlString = `
apiVersion: v1
metadata:
  name: mein-app-service
spec:
  replicas: 3
`;

// 4. YAML in ein JavaScript-Objekt parsen
const data = YAML.parse(yamlString);

// 5. Schema kompilieren und Daten validieren
const validate = ajv.compile(schema);
const valid = validate(data);

if (valid) {
  console.log("Die YAML-Datei ist valide!");
} else {
  console.log("Validierungsfehler gefunden:", validate.errors);
}
```
