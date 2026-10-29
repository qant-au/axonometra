// Axonometra: Home Assistant is an optional host. The planner's Home Assistant-only parts (Assist, the room device
// panel, time travel and the history trail, the camera wall and weather overlays, the star menu of services, scenes,
// the household card, the energy dashboard checklist and balance, Home Assistant floors and areas, the device lists,
// and the voice, director and favourites settings) show only when the host says Home Assistant is there.
//
// The switch is read from the host's object, not set in a module: the standalone build bundles its host separately
// from the engine. The standalone host marks its object (off unless `homeAssistant: true` is passed to
// mountAxonometra); Home Assistant's own object carries no mark, so in the integration everything is on as upstream.
// The entity pickers on items are not gated: a signal source (Signal K) feeds the same entity-shaped states.

/** The mark a host puts on its HomeAssistant-shaped object to say whether Home Assistant is behind it. */
export interface HostMark {
  axonometra?: { homeAssistant?: boolean };
}

/** Whether the Home Assistant-only parts of the planner show: on in Home Assistant, off in the standalone host. */
export function haFeatures(hass: unknown): boolean {
  return (hass as HostMark | null | undefined)?.axonometra?.homeAssistant ?? true;
}
