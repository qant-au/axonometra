/**
 * The upstream author's online services, switched off in Axonometra.
 *
 * NeonPlan 3D sells its Pro add-ons and packs through its author's shop at mastershort.de, and the app connects
 * to it: licence keys, the pack catalogue, offers, the newsletter, gift and news notices, Pro teasers that link to
 * the shop, and opt-in usage reports. Axonometra keeps all of that code, maintained and covered by upstream's tests,
 * but while this is off none of it shows and nothing reaches his servers. The backend has the same switch
 * (custom_components/axonometra/upstream.py).
 *
 * Turning it on is a decision to take with the author, not a setting: see fork/README.md.
 */
let on = false;

export function upstreamServices(): boolean {
  return on;
}

/** Tests only: upstream's own tests exercise the shop code with the services on. */
export function setUpstreamServices(value: boolean): void {
  on = value;
}
