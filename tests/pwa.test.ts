import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
test("service worker never intercepts API, mutations or cross-origin requests", async () => {
  const listeners: Record<string, (event: unknown) => void> = {};
  const offline = { offline: true };
  runInNewContext(await readFile("public/admin-sw.js", "utf8"), {
    self: {
      location: { origin: "https://ketansum.test" },
      addEventListener: (name: string, fn: (event: unknown) => void) => {
        listeners[name] = fn;
      },
    },
    URL,
    Response,
    fetch: async () => {
      throw Error("offline");
    },
    caches: { match: async () => offline },
  });
  for (const [path, method, mode] of [
    ["/api/workspace", "GET", "cors"],
    ["/api/workspace", "POST", "cors"],
    ["/admin", "POST", "navigate"],
    ["https://other.test/admin", "GET", "navigate"],
    ["/", "GET", "navigate"],
  ]) {
    let intercepted = false;
    listeners.fetch({
      request: {
        url: new URL(path, "https://ketansum.test").href,
        method,
        mode,
      },
      respondWith: () => {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false);
  }
  for (const path of ["/admin", "/admin/kasir", "/login"]) {
    let response: Promise<unknown> | undefined;
    listeners.fetch({
      request: {
        url: "https://ketansum.test" + path,
        method: "GET",
        mode: "navigate",
      },
      respondWith: (value: Promise<unknown>) => {
        response = value;
      },
    });
    assert.equal(await response, offline);
  }
});
