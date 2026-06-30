// The DATA-10 image-rights default-deny gate. Pure logic shared by the
// scripts/check-images.mjs CLI wrapper (run in prebuild) and test/images.test.js
// (research Pattern 4). Every function returns { errors }, except the reference
// collector which returns a plain array of reference strings.
//
// Default-deny is the whole point: an image is publishable ONLY when its rights
// record explicitly says so. The default rightsStatus, an unknown rightsStatus,
// and a referenced-but-unmanifested image are ALL treated as not-cleared and
// fail the build (research Pitfall 4). A brand name used as an identifier is not
// an image and is never collected here.

// The only rights determinations that clear the gate. Anything else, including
// the schema default "not-cleared" and any value absent from this set, is denied.
export const ALLOWED_RIGHTS = new Set([
  "own-photographed",
  "cleared",
  "fair-dealing-criticism",
]);

// The pinned convention for how entity data references an image: a string value
// at one of these scalar keys, or a string item in an array at one of the array
// keys. Documented here so every downstream entity author references images the
// same way and the gate can find them. Deliberately NARROW: it does NOT collect
// the manifest's own "images" array of rights records, only references.
const REFERENCE_KEYS = new Set(["image", "imageRef", "imageReference"]);
const REFERENCE_ARRAY_KEYS = new Set(["imageRefs", "imageReferences"]);

// Walk an entity tree and collect every image reference, by the pinned
// convention above. Returns a de-duplicated array of reference strings. In
// Phase 1 no entity references an image, so this returns [] over the live
// corpus, which is a valid pass (the non-zero corpus is the manifest).
export function collectReferencedImages(data) {
  const found = new Set();
  const visit = (node, key) => {
    if (node === null) return;
    if (typeof node === "string") {
      if (REFERENCE_KEYS.has(key)) found.add(node);
      return;
    }
    if (Array.isArray(node)) {
      const isReferenceArray = REFERENCE_ARRAY_KEYS.has(key);
      for (const child of node) {
        if (isReferenceArray && typeof child === "string") {
          found.add(child);
        } else {
          visit(child, key);
        }
      }
      return;
    }
    if (typeof node === "object") {
      for (const [childKey, child] of Object.entries(node)) {
        visit(child, childKey);
      }
    }
  };
  visit(data, "");
  return [...found];
}

// DATA-10 default-deny: every referenced image must resolve to a manifest record
// whose rightsStatus is in ALLOWED_RIGHTS, and a fair-dealing-criticism record
// must carry a justification. A missing record, a not-cleared record, an unknown
// status, or an unjustified fair-dealing claim is an error. Brand identifier
// strings never reach here because they are not collected as references.
export function checkImages(referencedImages, manifest) {
  const byReference = new Map();
  for (const record of manifest) {
    byReference.set(record.reference, record);
  }
  const errors = [];
  for (const reference of referencedImages) {
    const record = byReference.get(reference);
    if (!record) {
      errors.push(
        `referenced image "${reference}" has no rights record (treated as not-cleared; DATA-10 default-deny)`
      );
      continue;
    }
    if (!ALLOWED_RIGHTS.has(record.rightsStatus)) {
      errors.push(
        `referenced image "${reference}" has rightsStatus "${record.rightsStatus}" and is not cleared for publication (DATA-10)`
      );
      continue;
    }
    if (record.rightsStatus === "fair-dealing-criticism" && !record.justification) {
      errors.push(
        `referenced image "${reference}" claims fair-dealing-criticism but records no justification (DATA-10)`
      );
    }
  }
  return { errors };
}
