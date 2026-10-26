// The hull: one interface (sections at stations) for every hull source, and what is worked out from it.

export type { Hull, HullBody, Section, SectionPoint } from "./types.ts";
export { bodyOutlineAt, bodyRange, bottomAt, halfAt, outlineAt, sampleXs, sectionAt, sheerAt } from "./sections.ts";
export { hydrostatics, SEA_WATER, type Hydrostatics } from "./hydrostatics.ts";
export { parametricHull, type ParametricHullSpec } from "./parametric.ts";
export { plateHull, type PlateHullSpec } from "./plate.ts";
export { ShipD, shipdBody, shipdConstraints, shipdFeasible, SHIPD_PARAMETERS, type ShipDBodyOptions } from "./shipd.ts";
export { pontoonBody, revolutionBody, type PontoonSpec, type RevolutionOptions } from "./revolution.ts";
export { ribTube, tubeBottom, type Tube, type TubeSpec } from "./tube.ts";
export * as parts from "./parts.ts";
export { innerBody } from "./skin.ts";
export { bodyMesh, meshVolume, ringsMesh, tubeGeometry, type Mesh } from "./mesh.ts";
export { CATALOGUE, type CatalogueEntry, type CatalogueHull } from "./catalogue.ts";
export { SHIPD_EXAMPLES, type ShipDExample } from "./examples.ts";
export { asymmetricBody, foilOutrigger, outriggerBodies, placeBody, steppedBody, strutBody, type FoilOutriggerSpec, type OutriggerSpec, type Step, type StrutSpec } from "./forms.ts";
export { axes, float, gzCurve, hullMiddle, immersion, restingHeel, type Attitude, type Floating, type Immersion, type Load, type Vec3 } from "./stability.ts";
