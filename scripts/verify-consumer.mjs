// Proves the npm package from the outside: packs @axonometra/editor, installs
// the tarball and its peer dependencies (from the npm registry) into a fresh
// app built from e2e/fixtures/consumer, builds that app with Vite and serves
// it on 4893 under the container's CSP. The Playwright `consumer` project
// (AXO_CONSUMER=1) drives it; Playwright starts this script as its server.
//
//   node scripts/verify-consumer.mjs          build, then serve
//   node scripts/verify-consumer.mjs --build  build only
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = join(root, '.consumer');
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

run('npm', ['run', 'build:lib'], root);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
run('npm', ['pack', '--pack-destination', work], root);
const tarball = `axonometra-editor-${pkg.version}.tgz`;

cpSync(join(root, 'e2e/fixtures/consumer'), work, { recursive: true });
writeFileSync(
  join(work, 'package.json'),
  JSON.stringify(
    {
      name: 'axonometra-consumer',
      private: true,
      type: 'module',
      dependencies: {
        '@axonometra/editor': `file:./${tarball}`,
        ...pkg.peerDependencies
      },
      devDependencies: {
        vite: pkg.devDependencies.vite,
        '@vitejs/plugin-react': pkg.devDependencies['@vitejs/plugin-react']
      }
    },
    null,
    2
  )
);
run('npm', ['install', '--no-audit', '--no-fund'], work);
run('npx', ['vite', 'build'], work);

if (!process.argv.includes('--build')) {
  const { CONTAINER_CSP } = await import(join(root, 'vite.config.mts'));
  spawn('npx', ['vite', 'preview'], {
    cwd: work,
    stdio: 'inherit',
    env: { ...process.env, CONSUMER_CSP: CONTAINER_CSP }
  });
}
