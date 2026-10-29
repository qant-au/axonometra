// Axonometra: with the author's online services off, no add-on is advertised; one unlocked by a pack still shows.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { released } from "./features.ts";
import { setPacks } from "./packs.ts";
import { upstreamServices } from "./upstream.ts";

test("the author's online services ship switched off", () => {
  assert.equal(upstreamServices(), false);
});

test("the author's Halloween ghost stays off with his services, whatever packs are installed", () => {
  // a hook in the 3D view, not a unit of its own: this keeps it in place across upstream merges
  const view = readFileSync(new URL("./components/view3d.ts", import.meta.url), "utf8");
  assert.match(view, /const on = upstreamServices\(\) && !!b && hasFeature\("fun_halloween"\)/);
});

test("without the shop, an add-on shows only once its pack is installed", () => {
  setPacks([]);
  assert.equal(released("auto_pro"), false);
  assert.equal(released("camera_cockpit"), false);
  assert.equal(released("diagnostics"), false);
  assert.equal(released("fun_halloween"), false);
  // a free feature is not sold: it shows as upstream releases it
  assert.equal(released("locate"), true);
  setPacks([{ id: "mastershort.pro_auto", name: "Pro: Auto Pro", items: [], features: ["auto_pro"] } as never]);
  assert.equal(released("auto_pro"), true);
  setPacks([]);
});
