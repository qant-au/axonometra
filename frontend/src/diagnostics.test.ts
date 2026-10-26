import assert from "node:assert/strict";
import { test } from "node:test";
import { browserOf, deviceClass, gpuTier, osOf, ourFrame, scrubMessage } from "./diagnostics.ts";
import { setUpstreamServices } from "./upstream.ts";

// Accurona: upstream's tests exercise the report code, so it stays maintained; in use it is off (upstream.ts)
setUpstreamServices(true);

test("error messages lose URLs, addresses, entity ids, tokens and long ids", () => {
  assert.equal(scrubMessage("TypeError: x is undefined"), "TypeError: x is undefined");
  assert.equal(scrubMessage("Cannot read light.wohnzimmer_decke at https://192.168.1.5:8123/api?x=1"), "Cannot read <entity> at <url>");
  assert.equal(scrubMessage("binary_sensor.door failed for torsten@example.com from 10.0.0.2:8123"), "<entity> failed for <email> from <ip>");
  assert.equal(scrubMessage("my_custom.living_room_temp is NaN"), "<entity> is NaN");
  assert.equal(scrubMessage("token eyJhbGc.eyJzdWIi.c2lnbmF0 and id deadbeefdeadbeef0011"), "token <token> and id <id>");
  assert.equal(scrubMessage("host fe80::1:2:3:4 down"), "host <ip> down");
  assert.equal(scrubMessage("ws://homeassistant.local:8123/api/websocket closed"), "<url> closed");
  // code in a message stays readable
  assert.equal(scrubMessage("this.viewer is null"), "this.viewer is null");
  assert.equal(scrubMessage("Cannot read properties of undefined (reading 'rooms')"), "Cannot read properties of undefined (reading 'rooms')");
  // whitespace collapses and the message is cut at 200 characters
  assert.equal(scrubMessage("a\n  b"), "a b");
  assert.equal(scrubMessage("x".repeat(500)).length, 200);
  assert.equal(scrubMessage(undefined), "");
});

test("only errors of our own bundles have a place, without the URL before it", () => {
  const stack = "TypeError: boom\n    at a (http://10.0.0.2:8123/accurona_static/accurona-3d.js?v=1.17.0-abc:1:23456)\n    at b (x.js:1:1)";
  assert.equal(ourFrame(stack), "accurona-3d.js:1:23456");
  assert.equal(ourFrame("Error\n    at f (https://ha/accurona_static/accurona.js:2:99)"), "accurona.js:2:99");
  assert.equal(ourFrame("Error\n    at f (https://ha/frontend_latest/app.js:2:99)"), null);
  assert.equal(ourFrame(undefined, "https://ha/accurona_static/accurona-editor.js?v=1", 1, 5), "accurona-editor.js:1:5");
  assert.equal(ourFrame(undefined, "https://ha/other.js", 1, 5), null);
});

const UA = {
  fire: "Mozilla/5.0 (Linux; Android 9; KFMAWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/120.4.1 like Chrome/120.0.6099.230 Safari/537.36",
  androidPhone: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 12; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  webview: "Mozilla/5.0 (Linux; Android 11; Lenovo TB-X606F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
  ipadDesktopMode: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
  companionIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Home Assistant/2024.10",
  windowsEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
};

test("device class, browser and OS from the User-Agent, screen and touch", () => {
  assert.equal(deviceClass(UA.fire, 600, 5), "tablet");
  assert.equal(deviceClass(UA.androidPhone, 412, 5), "phone");
  assert.equal(deviceClass(UA.androidTablet, 800, 10), "tablet");
  assert.equal(deviceClass(UA.iphone, 390, 5), "phone");
  assert.equal(deviceClass(UA.ipadDesktopMode, 820, 5), "tablet");
  assert.equal(deviceClass(UA.ipadDesktopMode, 900, 0), "desktop");
  assert.equal(deviceClass(UA.windowsEdge, 1080, 0), "desktop");

  assert.equal(browserOf(UA.fire), "Silk 120");
  assert.equal(browserOf(UA.androidPhone), "Chrome 129");
  assert.equal(browserOf(UA.webview), "WebView 118");
  assert.equal(browserOf(UA.iphone), "Safari 17");
  assert.equal(browserOf(UA.companionIos), "WebKit");
  assert.equal(browserOf(UA.windowsEdge), "Edge 130");
  assert.equal(browserOf(UA.linuxFirefox), "Firefox 131");
  assert.equal(browserOf("curl/8"), "other");

  assert.equal(osOf(UA.fire), "Android 9");
  assert.equal(osOf(UA.iphone), "iOS 17");
  assert.equal(osOf(UA.ipadDesktopMode, 5), "iPadOS");
  assert.equal(osOf(UA.ipadDesktopMode, 0), "macOS");
  assert.equal(osOf(UA.windowsEdge), "Windows 10");
  assert.equal(osOf(UA.linuxFirefox), "Linux");
});

test("the GPU is reported as a rough class only", () => {
  assert.equal(gpuTier("Mali-G52 MC2"), "low");
  assert.equal(gpuTier("Adreno (TM) 506"), "low");
  assert.equal(gpuTier("Google SwiftShader"), "low");
  assert.equal(gpuTier("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"), "high");
  assert.equal(gpuTier("Apple GPU"), "high");
  assert.equal(gpuTier("Adreno (TM) 660"), "high");
  assert.equal(gpuTier("ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)"), "mid");
  assert.equal(gpuTier(""), null);
  assert.equal(gpuTier(null), null);
});

test("the reports are released (2.0.1): the switch shows for admins, off until they turn it on", async () => {
  const { released, UNRELEASED } = await import("./features.ts");
  assert.ok(!UNRELEASED.includes("diagnostics"));
  assert.equal(released("diagnostics"), true);
});
