import { notifications } from '@mantine/notifications';

const MAX_BYTES = 5 * 1024 * 1024;
// Browsers frequently report an empty MIME type for `.json` files, so the
// name check below is the primary gate and the type check is a fallback.
const ALLOWED_TYPES = ['application/json', 'text/plain', ''];

/**
 * Validate a user-selected plan file on size and type, then return its text.
 * Returns null (and surfaces a notification) when the file is missing,
 * the wrong type, or larger than 5 MB.
 */
export async function readPlanFile(
  file: File | null | undefined
): Promise<string | null> {
  if (!file) {
    return null;
  }
  const nameOk = /\.(json|txt)$/i.test(file.name);
  const typeOk = ALLOWED_TYPES.includes(file.type);
  if (!nameOk && !typeOk) {
    notifications.show({
      title: 'Unsupported file',
      message: 'Please choose a .json plan file.',
      color: 'red'
    });
    return null;
  }
  if (file.size > MAX_BYTES) {
    notifications.show({
      title: 'File too large',
      message: 'Plan files must be smaller than 5 MB.',
      color: 'red'
    });
    return null;
  }
  return file.text();
}
