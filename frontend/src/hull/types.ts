// The hull interface: a hull is one or more bodies, each a run of cross-sections at stations along its length.
// Every hull source (a parametric hull, an imported hull, a set of offsets) produces this, and everything that
// needs the hull's shape (outlines at a height, hydrostatics, the 3D skin) reads it through the queries in
// sections.ts, never the source's own terms.
//
// Plan coordinates, metres: x along the length from the stern forward, y up from the design waterline (y = 0),
// z across the boat (a body's centre line is z = center; port is −z, starboard +z).

/**
 * A point on a section: height above the waterline (y) and the half-breadth there, the same each side; or, for a
 * hull that is not symmetric about its centre line (an asymmetric catamaran demihull), the half-breadth to port and
 * then the half-breadth to starboard.
 */
export type SectionPoint = [y: number, half: number, starboard?: number];

export interface Section {
  /** Where the station is along the length. */
  x: number;
  /**
   * From the lowest point of the section up to the sheer, y increasing; at least two points. A transom or a flat
   * bottom starts with a half-breadth above zero; a stem section can be all zeros.
   */
  points: SectionPoint[];
}

export interface HullBody {
  /** The body's centre line across the boat (0 for a monohull, ± for a catamaran's hulls). */
  center: number;
  /** In increasing x, at least two; the body runs from the first station to the last. */
  sections: Section[];
}

export interface Hull {
  bodies: HullBody[];
}
