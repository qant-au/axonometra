// Zod compiles a fast path for each object schema with new Function(), after
// probing whether eval is allowed. Under a Content-Security-Policy without
// 'unsafe-eval' (the container's, docker/nginx.conf) the probe fails quietly
// but the browser still reports a script-src violation on every page load.
// Jitless mode skips both. It is read when a schema is built, so this module
// must be imported before anything that builds one (@accurona/core's scene
// schema): first, from each entry point.
import { config } from 'zod';

config({ jitless: true });
