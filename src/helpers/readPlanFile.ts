import type { NotifyOptions } from '@accurona/ui';

const MAX_BYTES = 5 * 1024 * 1024;
// Browsers frequently report an empty MIME type for `.json` files, so the
// name check below is the primary gate and the type check is a fallback.
const ALLOWED_TYPES = ['application/json', 'text/plain', ''];

/**
 * Validate a user-selected plan file on size and type, then return its text.
 * Returns null (and surfaces a notification) when the file is missing,
 * the wrong type, or larger than 5 MB.
 *
 * `notify` is the editor's own notifier: the page-wide `notify` from
 * @accurona/ui reaches no display in an editor, so these warnings were
 * never seen (sweep 2026-09-30).
 */
export async function readPlanFile(
  file: File | null | undefined,
  notify: (options: NotifyOptions) => void
): Promise<string | null> {
  if (!file) {
    return null;
  }
  const nameOk = /\.(json|txt)$/i.test(file.name);
  const typeOk = ALLOWED_TYPES.includes(file.type);
  if (!nameOk && !typeOk) {
    notify({
      title: 'Unsupported file',
      message: 'Please choose a .json plan file.',
      severity: 'error'
    });
    return null;
  }
  if (file.size > MAX_BYTES) {
    notify({
      title: 'File too large',
      message: 'Plan files must be smaller than 5 MB.',
      severity: 'error'
    });
    return null;
  }
  return file.text();
}
