// DATA-10 image-rights default-deny gate. The valid cases clear the gate; the
// negative fixtures (a not-cleared referenced packshot, a referenced-but-
// unmanifested image) each prove a failure mode. Child-process spawns confirm
// the SCRIPT exits non-zero on a bad fixture and on an empty manifest (build-
// fail + non-zero-corpus proof; mirrors Plan 01-05 Task 3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { checkImages, collectReferencedImages } from "../lib/check-images.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(dir, rel), "utf8"));
const SCRIPT = resolve(dir, "../scripts/check-images.mjs");

test("an own-photographed referenced image clears the gate (DATA-10)", () => {
  const manifest = [{ id: "own", reference: "assets/own.jpg", rightsStatus: "own-photographed" }];
  assert.equal(checkImages(["assets/own.jpg"], manifest).errors.length, 0);
});

test("a cleared and a justified fair-dealing image clear the gate", () => {
  const manifest = [
    { id: "cleared", reference: "a.jpg", rightsStatus: "cleared" },
    {
      id: "fair",
      reference: "b.jpg",
      rightsStatus: "fair-dealing-criticism",
      justification: "Criticism and review of the product label.",
    },
  ];
  assert.equal(checkImages(["a.jpg", "b.jpg"], manifest).errors.length, 0);
});

test("a fair-dealing image with no justification is rejected", () => {
  const manifest = [{ id: "fair", reference: "b.jpg", rightsStatus: "fair-dealing-criticism" }];
  assert.ok(checkImages(["b.jpg"], manifest).errors.length > 0);
});

test("a not-cleared referenced packshot is rejected (DATA-10 default-deny)", () => {
  const fx = load("fixtures/invalid/uncleared-packshot.json");
  assert.ok(checkImages(fx.referenced, fx.manifest).errors.length > 0);
});

test("a referenced-but-unmanifested image is rejected (DATA-10 default-deny)", () => {
  const entity = load("fixtures/invalid/unmanifested-image.json");
  const referenced = collectReferencedImages(entity);
  assert.ok(referenced.length > 0, "the fixture must reference an image by the pinned convention");
  assert.ok(checkImages(referenced, []).errors.length > 0);
});

test("a brand identifier string is not collected as an image reference", () => {
  const entity = { id: "demo", name: "A Brand Name", brandId: "a-brand" };
  assert.equal(collectReferencedImages(entity).length, 0);
});

test("zero referenced images is a valid pass (the corpus is the manifest)", () => {
  const manifest = [{ id: "own", reference: "assets/own.jpg", rightsStatus: "own-photographed" }];
  assert.equal(checkImages([], manifest).errors.length, 0);
});

test("the script exits non-zero on the uncleared packshot fixture (build-fail proof)", () => {
  const fixture = resolve(dir, "fixtures/invalid/uncleared-packshot.json");
  assert.throws(() => execFileSync(process.execPath, [SCRIPT, fixture], { stdio: "pipe" }));
});

test("the script exits non-zero on an empty manifest (the non-zero-corpus guard)", () => {
  const work = mkdtempSync(resolve(tmpdir(), "ft-img-empty-"));
  try {
    assert.throws(() => execFileSync(process.execPath, [SCRIPT, work], { stdio: "pipe" }));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
