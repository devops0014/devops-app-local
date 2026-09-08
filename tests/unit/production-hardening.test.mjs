import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("PWA manifest and offline shell are configured", async () => {
  const manifest = JSON.parse(await read("public/manifest.webmanifest"));
  const worker = await read("public/sw.js");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/dashboard");
  assert.match(worker, /PRIVATE_PATHS/);
  assert.match(worker, /\/offline/);
});

test("private API and auth routes are never cached by the service worker", async () => {
  const worker = await read("public/sw.js");
  for (const path of ["/api/", "/login", "/billing"]) assert.match(worker, new RegExp(path.replaceAll("/", "\\/")));
});

test("runtime adds baseline security headers", async () => {
  const worker = await read("worker/index.ts");
  for (const header of ["x-content-type-options", "referrer-policy", "permissions-policy", "x-frame-options"]) {
    assert.match(worker, new RegExp(header));
  }
});

test("mutating high-value endpoints have abuse and payload controls", async () => {
  for (const route of ["app/api/gamification/event/route.ts", "app/api/payments/create-checkout/route.ts"]) {
    const source = await read(route);
    assert.match(source, /checkRateLimit/);
    assert.match(source, /rejectOversizedJson/);
  }
});

test("dark platform UI raises muted-text contrast and minimum label sizes", async () => {
  const css = await read("app/globals.css");
  const shell = await read("components/app-shell.tsx");
  assert.match(shell, /app-shell min-h-screen/);
  for (const utility of ["text-zinc-700", "text-zinc-600", "text-zinc-500"]) {
    assert.match(css, new RegExp(`app-shell.*${utility}`));
  }
  for (const size of ["text-\\[8px\\]", "text-\\[9px\\]", "text-\\[10px\\]"]) {
    assert.match(css, new RegExp(`app-shell.*${size}`));
  }
});
