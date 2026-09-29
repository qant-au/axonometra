export { LENGTH_UNITS, METRIC_UNITS, formatLength, fromMm, isLengthUnit, parseLength, toMm, type ImperialUnit, type LengthUnit, type MetricUnit } from './units.js';
export { CONNECTOR_GLYPHS, REDACTED_LAYER, SCENE_FORMAT, SCENE_LIMITS, SCENE_SCHEMA_URL, SCENE_VERSION, idSchema, isAllowedIconUrl, isHttpUrl, sceneSchema, sceneShapeSchema, type Anchor, type Color, type Connection, type Connector, type DiagramPlacement, type DiagramView, type ExternalLink, type Floor, type Group, type Icon, type Layer, type PlanPlacement, type PlanView, type Port, type Rectangle, type Scene, type SceneObject, type TextBox, type Tile, type View, type Wall, type WallNode } from './scene/schema.js';
export { checkReferences, type ReferenceIssue } from './scene/references.js';
export { emptyScene, isSceneDocument, parseJson, parseScene, serializeScene, validateScene, type SceneResult } from './scene/parse.js';
export { mergeScene, type PreserveFields, type SceneUpdate } from './scene/merge.js';
