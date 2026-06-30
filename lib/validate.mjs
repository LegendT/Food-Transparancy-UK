// The Ajv structural gate (TRUST-05, DATA-11, DATA-03 structure, DATA-04,
// DATA-07, the structural claim-type rule). Pure functions returning { errors }
// so the script wrapper and the test suite share one implementation
// (research Pattern 4).
//
// Import note: the specifier is "ajv/dist/2020.js" WITH the .js extension.
// ajv@8.20.0 ships no package "exports" map, so under Node 24's ESM resolver
// the extensionless "ajv/dist/2020" does not resolve. This is the recorded
// STATE decision from the plan 01-01 smoke test.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Build an Ajv 2020 instance with every schema in schemaDir registered by $id.
// allErrors so a fixture reports all violations at once; strict so a malformed
// schema fails loudly rather than silently mis-validating.
export function compile(schemaDir) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv); // enables the "date" and "uri" formats the envelope and registry use
  for (const file of readdirSync(schemaDir).filter((name) => name.endsWith(".schema.json"))) {
    ajv.addSchema(JSON.parse(readFileSync(join(schemaDir, file), "utf8")));
  }
  return ajv;
}

// Validate a list of { path, schemaId, data } entries against their schemas.
// Returns { errors } as readable "path instancePath message" strings.
export function validateDataset(ajv, files) {
  const errors = [];
  for (const { path, schemaId, data } of files) {
    const validate = ajv.getSchema(schemaId);
    if (!validate) {
      errors.push(`${path}: no compiled schema for ${schemaId}`);
      continue;
    }
    if (!validate(data)) {
      for (const error of validate.errors) {
        errors.push(`${path} ${error.instancePath || "/"} ${error.message}`);
      }
    }
  }
  return { errors };
}
