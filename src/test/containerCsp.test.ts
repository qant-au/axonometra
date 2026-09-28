import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The production e2e project runs `vite preview` with a copy of the
// container's Content-Security-Policy. If the two drift, that project stops
// testing what the container serves, which is how the container shipped
// unable to draw anything while every test passed.
describe('container CSP', () => {
  it('vite preview sends exactly the policy docker/nginx.conf does', () => {
    const root = resolve(__dirname, '../..');
    const nginx = readFileSync(resolve(root, 'docker/nginx.conf'), 'utf8');
    const vite = readFileSync(resolve(root, 'vite.config.mts'), 'utf8');
    const nginxPolicies = [
      ...nginx.matchAll(/add_header Content-Security-Policy "([^"]+)"/g)
    ].map((m) => m[1]);
    const vitePolicy = /CONTAINER_CSP =\s*"([^"]+)"/.exec(vite)?.[1];
    expect(nginxPolicies.length).toBeGreaterThan(0);
    expect(new Set(nginxPolicies).size).toBe(1);
    expect(vitePolicy).toBe(nginxPolicies[0]);
  });
});
