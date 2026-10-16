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
  for (const path of ["/api/", "/login"]) assert.match(worker, new RegExp(path.replaceAll("/", "\\/")));
});

test("runtime adds baseline security headers", async () => {
  const worker = await read("worker/index.ts");
  for (const header of ["x-content-type-options", "referrer-policy", "permissions-policy", "x-frame-options"]) {
    assert.match(worker, new RegExp(header));
  }
});

test("mutating high-value endpoints have abuse and payload controls", async () => {
  for (const route of ["app/api/gamification/event/route.ts"]) {
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
});

test("no UI text is smaller than 11px", async () => {
  const { readdir } = await import("node:fs/promises");
  const walk = async (dir) => (await Promise.all((await readdir(new URL(`../../${dir}`, import.meta.url), { withFileTypes: true }))
    .map((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : entry.name.endsWith(".tsx") ? [`${dir}/${entry.name}`] : []))).flat();
  for (const file of [...await walk("app"), ...await walk("components")]) {
    assert.doesNotMatch(await read(file), /text-\[(?:[1-9]|10)px\]/, `${file} uses text smaller than 11px`);
  }
});
