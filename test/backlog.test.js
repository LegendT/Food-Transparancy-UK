/*
 * PROD-14 machine-verifiable backlog test. It guards the historic-sourcing
 * candidate pool so a target that loses its driver, tier hint or rationale, or
 * a pool that quietly becomes all-Tier-A-candidate, fails the build loudly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const dir = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(dir, rel), "utf8"));

const backlog = load("../docs/sourcing-backlog.json");
const schema = load("../schemas/sourcing-backlog.schema.json");

const VALID_DRIVER_TYPES = ["mandate", "incentive"];
const VALID_TIERS = ["A-candidate", "B-candidate", "C-candidate"];

test("the backlog holds at least 20 candidate targets", () => {
  assert.ok(Array.isArray(backlog.targets), "targets is not an array");
  assert.ok(
    backlog.targets.length >= 20,
    `expected at least 20 candidate targets, found ${backlog.targets.length}`,
  );
});

test("every target carries a driver, a tier hint and a one-line rationale", () => {
  for (const target of backlog.targets) {
    const label = target.name || "(unnamed target)";

    assert.ok(target.driver, `${label} is missing a driver`);
    assert.ok(
      VALID_DRIVER_TYPES.includes(target.driver.type),
      `${label} has an invalid driver type: ${target.driver.type}`,
    );
    assert.ok(
      typeof target.driver.name === "string" && target.driver.name.trim() !== "",
      `${label} is missing a driver name`,
    );

    assert.ok(
      VALID_TIERS.includes(target.tier),
      `${label} has an invalid tier hint: ${target.tier}`,
    );

    assert.ok(
      typeof target.rationale === "string" && target.rationale.trim() !== "",
      `${label} is missing a rationale`,
    );
  }
});

test("the pool is not all-Tier-A-candidate, so it cannot over-promise", () => {
  const nonTierA = backlog.targets.filter((t) => t.tier !== "A-candidate");
  assert.ok(
    nonTierA.length >= 1,
    "the pool is all Tier A candidates and silently over-promises against the feasibility ceiling",
  );
});

test("the backlog validates against sourcing-backlog.schema.json", () => {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(backlog);
  assert.ok(
    valid,
    `backlog failed schema validation: ${JSON.stringify(validate.errors, null, 2)}`,
  );
});
