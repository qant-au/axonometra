// An element's mounting and facing (docs/scene-format.md, Mounting and
// facing): `mount` is cm from `mountFrom`, and `facing` says which way up the
// item is installed. All three are optional; absent they mean a floor
// reference and facing up. Only a ceiling mount may be negative: a recess, the
// item's top that many cm above the ceiling (a cassette body in the void), at
// most the item's height. `surface` marks an element whose top carries other
// items (a desk, a bench): cm from its underside to that top, at most its
// height. An element with mountFrom 'surface' stands on such an item.

export const MOUNT_FROM = ['floor', 'ceiling', 'surface'];
export const FACING = ['up', 'down'];

/** What is wrong with an element's mount, mountFrom, facing and surface; empty when nothing is. */
export function mountingErrors(el) {
  const errors = [];
  // A recess can bury the item up to its own height, never above the ceiling.
  const min = el.mountFrom === 'ceiling' ? -(el.size?.h ?? Infinity) : 0;
  if (el.mount != null && !(Number.isFinite(el.mount) && el.mount >= min)) {
    const range = ` >= ${min}`;
    errors.push(`mount ${JSON.stringify(el.mount)} is not a number of cm${range}`);
  }
  if (el.mountFrom != null && !MOUNT_FROM.includes(el.mountFrom)) {
    errors.push(`mountFrom ${JSON.stringify(el.mountFrom)} is not one of ${MOUNT_FROM.join(', ')}`);
  }
  if (el.facing != null && !FACING.includes(el.facing)) {
    errors.push(`facing ${JSON.stringify(el.facing)} is not one of ${FACING.join(', ')}`);
  }
  if (el.surface != null) {
    const h = el.size?.h ?? Infinity;
    if (!(Number.isFinite(el.surface) && el.surface > 0 && el.surface <= h)) {
      errors.push(`surface ${JSON.stringify(el.surface)} is not a number of cm > 0 and <= ${h}`);
    }
    if (el.mountFrom === 'surface') errors.push('an item that stands on a surface cannot carry one');
  }
  return errors;
}
