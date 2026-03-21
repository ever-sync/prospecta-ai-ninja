import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("index.html exposes mobile PWA meta tags", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.ok(html.includes('name="theme-color"'), "index.html should define a theme color for installed mode");
  assert.ok(
    html.includes('rel="apple-touch-icon"'),
    "index.html should expose an apple-touch-icon for iOS home screen installs",
  );
  assert.ok(
    html.includes('name="apple-mobile-web-app-capable" content="yes"'),
    "index.html should opt into iOS standalone mode",
  );
});

test("vite config enables the PWA plugin", () => {
  const viteConfig = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

  assert.ok(viteConfig.includes("VitePWA("), "vite.config.ts should register vite-plugin-pwa");
  assert.ok(viteConfig.includes('registerType: "autoUpdate"'), "PWA should auto-update after deploys");
});
