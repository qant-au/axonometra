import { z } from 'zod';
import { LENGTH_UNITS } from '../units.js';
import { checkReferences } from './references.js';
// The scene format, version 1: the native file format of Accurona,
// Axonometra and Reticulyne. docs/scene-format.md is the prose; this is the
// definition. Keep the two in step.
export const SCENE_FORMAT = 'accurona-scene';
export const SCENE_VERSION = 1;
export const SCENE_SCHEMA_URL = 'https://cdn.jsdelivr.net/npm/@accurona/core@0/schema/scene-v1.json';
export const SCENE_LIMITS = {
    OBJECTS: 10_000,
    CONNECTIONS: 10_000,
    VIEWS: 1_000,
    PLACEMENTS: 10_000,
    CONNECTORS: 5_000,
    RECTANGLES: 5_000,
    TEXT_BOXES: 5_000,
    GROUPS: 5_000,
    ANCHORS: 100,
    FLOORS: 200,
    NODES: 10_000,
    WALLS: 10_000,
    LAYERS: 100,
    ICONS: 5_000,
    COLORS: 100,
    PORTS: 1_000,
    LINKS: 20,
    PROPS: 50,
    TAGS: 20,
    NAME: 100,
    DESCRIPTION: 1_000,
    ICON_URL: 65_536,
    TILE: 1_000,
    // Plan coordinates and lengths, in mm: 10 km.
    PLAN_MM: 10_000_000
};
/** The reserved layer: shown in an editor, left out of every export. */
export const REDACTED_LAYER = 'redacted';
export const idSchema = z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/, 'Ids are 1-64 of A-Z a-z 0-9 _ -');
const name = z.string().max(SCENE_LIMITS.NAME);
const description = z.string().max(SCENE_LIMITS.DESCRIPTION);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'A colour is #rrggbb');
const props = z
    .record(z.string().min(1).max(SCENE_LIMITS.NAME), z.union([z.string().max(SCENE_LIMITS.DESCRIPTION), z.number(), z.boolean()]))
    .refine((p) => Object.keys(p).length <= SCENE_LIMITS.PROPS, {
    message: `At most ${SCENE_LIMITS.PROPS} props`
});
// Opened by a person clicking it, so only http: and https:.
export const isHttpUrl = (url) => /^https?:\/\/[^\s]+$/i.test(url.trim());
const ICON_DATA_TYPES = ['png', 'jpeg', 'gif', 'webp', 'svg+xml'];
// http:, https:, blob:, a relative path, or a data:image/ URI of an allowed
// type. Everything else is refused, percent-encoded schemes included.
export const isAllowedIconUrl = (url) => {
    const trimmed = url.trim();
    if (!trimmed)
        return true;
    const lowered = trimmed.toLowerCase();
    if (/^[a-z][a-z0-9+.-]*%3a/.test(lowered))
        return false;
    const colon = trimmed.indexOf(':');
    if (colon === -1)
        return true;
    const scheme = lowered.slice(0, colon);
    // A ':' outside a scheme position (inside a relative path) is no scheme.
    if (!/^[a-z][a-z0-9+.-]*$/.test(scheme))
        return true;
    if (scheme === 'http' || scheme === 'https' || scheme === 'blob') {
        return true;
    }
    if (scheme === 'data') {
        const mime = /^data:([^;,]+)/i.exec(trimmed)?.[1]?.toLowerCase() ?? '';
        return (mime.startsWith('image/') &&
            ICON_DATA_TYPES.includes(mime.slice('image/'.length)));
    }
    return false;
};
export const externalLinkSchema = z
    .strictObject({
    source: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,39}$/),
    ref: z.string().min(1).max(200).optional(),
    url: z
        .string()
        .max(2_000)
        .refine(isHttpUrl, 'A link url must be http: or https:')
        .optional(),
    label: name.optional()
})
    .refine((l) => l.ref !== undefined || l.url !== undefined, {
    message: 'A link needs a ref or a url'
});
const links = z.array(externalLinkSchema).max(SCENE_LIMITS.LINKS);
export const portSchema = z.strictObject({
    id: idSchema,
    name: name.optional(),
    kind: z.string().max(SCENE_LIMITS.NAME).optional(),
    props: props.optional(),
    links: links.optional()
});
export const sceneObjectSchema = z.strictObject({
    id: idSchema,
    element: z.string().min(1).max(SCENE_LIMITS.NAME).optional(),
    icon: idSchema.optional(),
    name: name.optional(),
    description: description.optional(),
    tags: z.array(z.string().min(1).max(40)).max(SCENE_LIMITS.TAGS).optional(),
    props: props.optional(),
    ports: z.array(portSchema).max(SCENE_LIMITS.PORTS).optional(),
    links: links.optional()
});
export const connectionSchema = z.strictObject({
    id: idSchema,
    from: idSchema,
    fromPort: idSchema.optional(),
    to: idSchema,
    toPort: idSchema.optional(),
    kind: z.string().max(SCENE_LIMITS.NAME).optional(),
    name: name.optional(),
    description: description.optional(),
    props: props.optional(),
    links: links.optional()
});
const mm = z.number().min(-SCENE_LIMITS.PLAN_MM).max(SCENE_LIMITS.PLAN_MM);
const lengthMm = z.number().min(0).max(SCENE_LIMITS.PLAN_MM);
export const wallNodeSchema = z.strictObject({ id: idSchema, x: mm, y: mm });
export const wallSchema = z.strictObject({
    id: idSchema,
    from: idSchema,
    to: idSchema,
    exterior: z.boolean().optional(),
    layer: idSchema.optional()
});
export const floorSchema = z.strictObject({
    id: idSchema,
    name: name.optional(),
    elevationMm: mm.optional(),
    wallHeightMm: lengthMm.optional(),
    nodes: z.array(wallNodeSchema).max(SCENE_LIMITS.NODES).optional(),
    walls: z.array(wallSchema).max(SCENE_LIMITS.WALLS).optional()
});
export const planPlacementSchema = z.strictObject({
    object: idSchema,
    floor: idSchema,
    x: mm,
    y: mm,
    rotation: z.number().min(-360_000).max(360_000).optional(),
    mirror: z
        .strictObject({ x: z.boolean().optional(), y: z.boolean().optional() })
        .optional(),
    mountMm: mm.optional(),
    size: z
        .strictObject({
        w: lengthMm.optional(),
        d: lengthMm.optional(),
        h: lengthMm.optional()
    })
        .optional(),
    attach: z.strictObject({ wall: idSchema }).optional(),
    layer: idSchema.optional(),
    symbol: z.boolean().optional()
});
const viewBase = {
    id: idSchema,
    name,
    description: description.optional(),
    lastUpdated: z.iso.datetime({ offset: true }).optional()
};
export const planViewSchema = z.strictObject({
    ...viewBase,
    kind: z.literal('plan'),
    floors: z.array(floorSchema).max(SCENE_LIMITS.FLOORS),
    placements: z
        .array(planPlacementSchema)
        .max(SCENE_LIMITS.PLACEMENTS)
        .optional()
});
const tileCoord = z
    .number()
    .int()
    .min(-SCENE_LIMITS.TILE)
    .max(SCENE_LIMITS.TILE);
export const tileSchema = z.strictObject({ x: tileCoord, y: tileCoord });
export const diagramPlacementSchema = z.strictObject({
    object: idSchema,
    tile: tileSchema,
    labelHeight: z.number().min(-1_000).max(1_000).optional(),
    group: idSchema.optional(),
    layer: idSchema.optional()
});
export const anchorSchema = z.strictObject({
    id: idSchema,
    ref: z.union([
        z.strictObject({ object: idSchema }),
        z.strictObject({ anchor: idSchema }),
        z.strictObject({ tile: tileSchema })
    ])
});
export const CONNECTOR_GLYPHS = [
    'triangle',
    'chevron',
    'double-chevron',
    'circle-solid',
    'circle-outline',
    'diamond',
    'square',
    'dollar',
    'bolt',
    'envelope',
    'person',
    'star'
];
export const connectorSchema = z.strictObject({
    id: idSchema,
    connection: idSchema.optional(),
    anchors: z.array(anchorSchema).min(2).max(SCENE_LIMITS.ANCHORS),
    description: description.optional(),
    color: idSchema.optional(),
    width: z.number().min(0).max(1_000).optional(),
    style: z.enum(['SOLID', 'DOTTED', 'DASHED']).optional(),
    direction: z
        .enum(['START_TO_END', 'END_TO_START', 'BOTH', 'NONE'])
        .optional(),
    glyph: z.enum(CONNECTOR_GLYPHS).optional(),
    animated: z.boolean().optional(),
    animationRate: z.number().min(0).max(1).optional(),
    animationFlow: z.enum(['forward', 'reverse', 'both']).optional(),
    layer: idSchema.optional()
});
export const rectangleSchema = z.strictObject({
    id: idSchema,
    from: tileSchema,
    to: tileSchema,
    color: idSchema.optional(),
    colorValue: hex.optional(),
    outlineColor: hex.optional(),
    transparency: z.number().min(0).max(1).optional(),
    zIndex: z.number().int().optional(),
    group: idSchema.optional(),
    layer: idSchema.optional()
});
export const textBoxSchema = z.strictObject({
    id: idSchema,
    tile: tileSchema,
    content: name,
    fontSize: z.number().min(0).max(1_000).optional(),
    orientation: z.enum(['X', 'Y']).optional(),
    group: idSchema.optional(),
    layer: idSchema.optional()
});
export const groupSchema = z.strictObject({
    id: idSchema,
    name: name.optional(),
    color: hex.optional(),
    group: idSchema.optional()
});
export const diagramViewSchema = z.strictObject({
    ...viewBase,
    kind: z.enum(['iso', 'schematic']),
    placements: z
        .array(diagramPlacementSchema)
        .max(SCENE_LIMITS.PLACEMENTS)
        .optional(),
    connectors: z.array(connectorSchema).max(SCENE_LIMITS.CONNECTORS).optional(),
    rectangles: z.array(rectangleSchema).max(SCENE_LIMITS.RECTANGLES).optional(),
    textBoxes: z.array(textBoxSchema).max(SCENE_LIMITS.TEXT_BOXES).optional(),
    groups: z.array(groupSchema).max(SCENE_LIMITS.GROUPS).optional()
});
export const viewSchema = z.discriminatedUnion('kind', [
    planViewSchema,
    diagramViewSchema
]);
export const layerSchema = z.strictObject({
    id: idSchema,
    name,
    visible: z.boolean().optional()
});
export const iconSchema = z.strictObject({
    id: idSchema,
    name,
    url: z
        .string()
        .max(SCENE_LIMITS.ICON_URL)
        .refine(isAllowedIconUrl, 'An icon url is http(s):, blob:, a relative path or a data:image/ URI'),
    collection: name.optional(),
    isIsometric: z.boolean().optional()
});
export const colorSchema = z.strictObject({ id: idSchema, value: hex });
// Structure only: the JSON Schema is generated from this.
export const sceneShapeSchema = z.strictObject({
    $schema: z.string().max(2_000).optional(),
    format: z.literal(SCENE_FORMAT),
    version: z.literal(SCENE_VERSION),
    id: idSchema,
    title: name.optional(),
    description: description.optional(),
    units: z.enum(LENGTH_UNITS).optional(),
    objects: z.array(sceneObjectSchema).max(SCENE_LIMITS.OBJECTS),
    connections: z
        .array(connectionSchema)
        .max(SCENE_LIMITS.CONNECTIONS)
        .optional(),
    views: z.array(viewSchema).max(SCENE_LIMITS.VIEWS).optional(),
    layers: z.array(layerSchema).max(SCENE_LIMITS.LAYERS).optional(),
    icons: z.array(iconSchema).max(SCENE_LIMITS.ICONS).optional(),
    colors: z.array(colorSchema).max(SCENE_LIMITS.COLORS).optional(),
    links: links.optional()
});
/** A whole scene: its structure, and every id reference resolving. */
export const sceneSchema = sceneShapeSchema.superRefine((scene, ctx) => {
    for (const issue of checkReferences(scene)) {
        ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
    }
});
