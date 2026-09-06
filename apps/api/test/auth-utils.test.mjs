import assert from "node:assert/strict";
import test from "node:test";
import { createPkcePair, safeInternalPath } from "../dist/auth/auth.utils.js";

test("PKCE challenge is the S256 digest of a high-entropy verifier", async () => {
  const { verifier, challenge } = createPkcePair();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const expected = Buffer.from(digest).toString("base64url");
  assert.ok(verifier.length >= 43 && verifier.length <= 128);
  assert.equal(challenge, expected);
});

test("return URL accepts only internal paths", () => {
  assert.equal(safeInternalPath("/diary?from=login"), "/diary?from=login");
  assert.equal(safeInternalPath("https://evil.example"), "/profile");
  assert.equal(safeInternalPath("//evil.example"), "/profile");
  assert.equal(safeInternalPath("/\\evil.example"), "/profile");
  assert.equal(safeInternalPath("/ok\r\nLocation: https://evil.example"), "/profile");
});
