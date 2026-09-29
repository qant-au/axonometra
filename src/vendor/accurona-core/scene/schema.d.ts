import { z } from 'zod';
export declare const SCENE_FORMAT = "accurona-scene";
export declare const SCENE_VERSION = 1;
export declare const SCENE_SCHEMA_URL = "https://cdn.jsdelivr.net/npm/@accurona/core@0/schema/scene-v1.json";
export declare const SCENE_LIMITS: {
    readonly OBJECTS: 10000;
    readonly CONNECTIONS: 10000;
    readonly VIEWS: 1000;
    readonly PLACEMENTS: 10000;
    readonly CONNECTORS: 5000;
    readonly RECTANGLES: 5000;
    readonly TEXT_BOXES: 5000;
    readonly GROUPS: 5000;
    readonly ANCHORS: 100;
    readonly FLOORS: 200;
    readonly NODES: 10000;
    readonly WALLS: 10000;
    readonly LAYERS: 100;
    readonly ICONS: 5000;
    readonly COLORS: 100;
    readonly PORTS: 1000;
    readonly LINKS: 20;
    readonly PROPS: 50;
    readonly TAGS: 20;
    readonly NAME: 100;
    readonly DESCRIPTION: 1000;
    readonly ICON_URL: 65536;
    readonly TILE: 1000;
    readonly PLAN_MM: 10000000;
};
/** The reserved layer: shown in an editor, left out of every export. */
export declare const REDACTED_LAYER = "redacted";
export declare const idSchema: z.ZodString;
export declare const isHttpUrl: (url: string) => boolean;
export declare const isAllowedIconUrl: (url: string) => boolean;
export declare const externalLinkSchema: z.ZodObject<{
    source: z.ZodString;
    ref: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const portSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
    links: z.ZodOptional<z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        ref: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export declare const sceneObjectSchema: z.ZodObject<{
    id: z.ZodString;
    element: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
    ports: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
        links: z.ZodOptional<z.ZodArray<z.ZodObject<{
            source: z.ZodString;
            ref: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            label: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>>;
    links: z.ZodOptional<z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        ref: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export declare const connectionSchema: z.ZodObject<{
    id: z.ZodString;
    from: z.ZodString;
    fromPort: z.ZodOptional<z.ZodString>;
    to: z.ZodString;
    toPort: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
    links: z.ZodOptional<z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        ref: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export declare const wallNodeSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, z.core.$strict>;
export declare const wallSchema: z.ZodObject<{
    id: z.ZodString;
    from: z.ZodString;
    to: z.ZodString;
    exterior: z.ZodOptional<z.ZodBoolean>;
    layer: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const floorSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    elevationMm: z.ZodOptional<z.ZodNumber>;
    wallHeightMm: z.ZodOptional<z.ZodNumber>;
    nodes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strict>>>;
    walls: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        from: z.ZodString;
        to: z.ZodString;
        exterior: z.ZodOptional<z.ZodBoolean>;
        layer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export declare const planPlacementSchema: z.ZodObject<{
    object: z.ZodString;
    floor: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    rotation: z.ZodOptional<z.ZodNumber>;
    mirror: z.ZodOptional<z.ZodObject<{
        x: z.ZodOptional<z.ZodBoolean>;
        y: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
    mountMm: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodObject<{
        w: z.ZodOptional<z.ZodNumber>;
        d: z.ZodOptional<z.ZodNumber>;
        h: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    attach: z.ZodOptional<z.ZodObject<{
        wall: z.ZodString;
    }, z.core.$strict>>;
    layer: z.ZodOptional<z.ZodString>;
    symbol: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const planViewSchema: z.ZodObject<{
    kind: z.ZodLiteral<"plan">;
    floors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        elevationMm: z.ZodOptional<z.ZodNumber>;
        wallHeightMm: z.ZodOptional<z.ZodNumber>;
        nodes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>>>;
        walls: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            from: z.ZodString;
            to: z.ZodString;
            exterior: z.ZodOptional<z.ZodBoolean>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
    placements: z.ZodOptional<z.ZodArray<z.ZodObject<{
        object: z.ZodString;
        floor: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        rotation: z.ZodOptional<z.ZodNumber>;
        mirror: z.ZodOptional<z.ZodObject<{
            x: z.ZodOptional<z.ZodBoolean>;
            y: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        mountMm: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodObject<{
            w: z.ZodOptional<z.ZodNumber>;
            d: z.ZodOptional<z.ZodNumber>;
            h: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        attach: z.ZodOptional<z.ZodObject<{
            wall: z.ZodString;
        }, z.core.$strict>>;
        layer: z.ZodOptional<z.ZodString>;
        symbol: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>>;
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    lastUpdated: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>;
export declare const tileSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
}, z.core.$strict>;
export declare const diagramPlacementSchema: z.ZodObject<{
    object: z.ZodString;
    tile: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strict>;
    labelHeight: z.ZodOptional<z.ZodNumber>;
    group: z.ZodOptional<z.ZodString>;
    layer: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const anchorSchema: z.ZodObject<{
    id: z.ZodString;
    ref: z.ZodUnion<readonly [z.ZodObject<{
        object: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        anchor: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        tile: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
    }, z.core.$strict>]>;
}, z.core.$strict>;
export declare const CONNECTOR_GLYPHS: readonly ["triangle", "chevron", "double-chevron", "circle-solid", "circle-outline", "diamond", "square", "dollar", "bolt", "envelope", "person", "star"];
export declare const connectorSchema: z.ZodObject<{
    id: z.ZodString;
    connection: z.ZodOptional<z.ZodString>;
    anchors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        ref: z.ZodUnion<readonly [z.ZodObject<{
            object: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            anchor: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            tile: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
        }, z.core.$strict>]>;
    }, z.core.$strict>>;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    style: z.ZodOptional<z.ZodEnum<{
        SOLID: "SOLID";
        DOTTED: "DOTTED";
        DASHED: "DASHED";
    }>>;
    direction: z.ZodOptional<z.ZodEnum<{
        START_TO_END: "START_TO_END";
        END_TO_START: "END_TO_START";
        BOTH: "BOTH";
        NONE: "NONE";
    }>>;
    glyph: z.ZodOptional<z.ZodEnum<{
        triangle: "triangle";
        chevron: "chevron";
        "double-chevron": "double-chevron";
        "circle-solid": "circle-solid";
        "circle-outline": "circle-outline";
        diamond: "diamond";
        square: "square";
        dollar: "dollar";
        bolt: "bolt";
        envelope: "envelope";
        person: "person";
        star: "star";
    }>>;
    animated: z.ZodOptional<z.ZodBoolean>;
    animationRate: z.ZodOptional<z.ZodNumber>;
    animationFlow: z.ZodOptional<z.ZodEnum<{
        forward: "forward";
        reverse: "reverse";
        both: "both";
    }>>;
    layer: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const rectangleSchema: z.ZodObject<{
    id: z.ZodString;
    from: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strict>;
    to: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strict>;
    color: z.ZodOptional<z.ZodString>;
    colorValue: z.ZodOptional<z.ZodString>;
    outlineColor: z.ZodOptional<z.ZodString>;
    transparency: z.ZodOptional<z.ZodNumber>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    group: z.ZodOptional<z.ZodString>;
    layer: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const textBoxSchema: z.ZodObject<{
    id: z.ZodString;
    tile: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strict>;
    content: z.ZodString;
    fontSize: z.ZodOptional<z.ZodNumber>;
    orientation: z.ZodOptional<z.ZodEnum<{
        X: "X";
        Y: "Y";
    }>>;
    group: z.ZodOptional<z.ZodString>;
    layer: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const groupSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const diagramViewSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        iso: "iso";
        schematic: "schematic";
    }>;
    placements: z.ZodOptional<z.ZodArray<z.ZodObject<{
        object: z.ZodString;
        tile: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        labelHeight: z.ZodOptional<z.ZodNumber>;
        group: z.ZodOptional<z.ZodString>;
        layer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    connectors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        connection: z.ZodOptional<z.ZodString>;
        anchors: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            ref: z.ZodUnion<readonly [z.ZodObject<{
                object: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                anchor: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                tile: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, z.core.$strict>;
            }, z.core.$strict>]>;
        }, z.core.$strict>>;
        description: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            SOLID: "SOLID";
            DOTTED: "DOTTED";
            DASHED: "DASHED";
        }>>;
        direction: z.ZodOptional<z.ZodEnum<{
            START_TO_END: "START_TO_END";
            END_TO_START: "END_TO_START";
            BOTH: "BOTH";
            NONE: "NONE";
        }>>;
        glyph: z.ZodOptional<z.ZodEnum<{
            triangle: "triangle";
            chevron: "chevron";
            "double-chevron": "double-chevron";
            "circle-solid": "circle-solid";
            "circle-outline": "circle-outline";
            diamond: "diamond";
            square: "square";
            dollar: "dollar";
            bolt: "bolt";
            envelope: "envelope";
            person: "person";
            star: "star";
        }>>;
        animated: z.ZodOptional<z.ZodBoolean>;
        animationRate: z.ZodOptional<z.ZodNumber>;
        animationFlow: z.ZodOptional<z.ZodEnum<{
            forward: "forward";
            reverse: "reverse";
            both: "both";
        }>>;
        layer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    rectangles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        from: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        to: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        color: z.ZodOptional<z.ZodString>;
        colorValue: z.ZodOptional<z.ZodString>;
        outlineColor: z.ZodOptional<z.ZodString>;
        transparency: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        group: z.ZodOptional<z.ZodString>;
        layer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    textBoxes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tile: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        content: z.ZodString;
        fontSize: z.ZodOptional<z.ZodNumber>;
        orientation: z.ZodOptional<z.ZodEnum<{
            X: "X";
            Y: "Y";
        }>>;
        group: z.ZodOptional<z.ZodString>;
        layer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    groups: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodString>;
        group: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    lastUpdated: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>;
export declare const viewSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"plan">;
    floors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        elevationMm: z.ZodOptional<z.ZodNumber>;
        wallHeightMm: z.ZodOptional<z.ZodNumber>;
        nodes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>>>;
        walls: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            from: z.ZodString;
            to: z.ZodString;
            exterior: z.ZodOptional<z.ZodBoolean>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
    placements: z.ZodOptional<z.ZodArray<z.ZodObject<{
        object: z.ZodString;
        floor: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        rotation: z.ZodOptional<z.ZodNumber>;
        mirror: z.ZodOptional<z.ZodObject<{
            x: z.ZodOptional<z.ZodBoolean>;
            y: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        mountMm: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodObject<{
            w: z.ZodOptional<z.ZodNumber>;
            d: z.ZodOptional<z.ZodNumber>;
            h: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        attach: z.ZodOptional<z.ZodObject<{
            wall: z.ZodString;
        }, z.core.$strict>>;
        layer: z.ZodOptional<z.ZodString>;
        symbol: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>>;
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    lastUpdated: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodEnum<{
        iso: "iso";
        schematic: "schematic";
    }>;
    placements: z.ZodOptional<z.ZodArray<z.ZodObject<{
        object: z.ZodString;
        tile: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        labelHeight: z.ZodOptional<z.ZodNumber>;
        group: z.ZodOptional<z.ZodString>;
        layer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    connectors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        connection: z.ZodOptional<z.ZodString>;
        anchors: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            ref: z.ZodUnion<readonly [z.ZodObject<{
                object: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                anchor: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                tile: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, z.core.$strict>;
            }, z.core.$strict>]>;
        }, z.core.$strict>>;
        description: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            SOLID: "SOLID";
            DOTTED: "DOTTED";
            DASHED: "DASHED";
        }>>;
        direction: z.ZodOptional<z.ZodEnum<{
            START_TO_END: "START_TO_END";
            END_TO_START: "END_TO_START";
            BOTH: "BOTH";
            NONE: "NONE";
        }>>;
        glyph: z.ZodOptional<z.ZodEnum<{
            triangle: "triangle";
            chevron: "chevron";
            "double-chevron": "double-chevron";
            "circle-solid": "circle-solid";
            "circle-outline": "circle-outline";
            diamond: "diamond";
            square: "square";
            dollar: "dollar";
            bolt: "bolt";
            envelope: "envelope";
            person: "person";
            star: "star";
        }>>;
        animated: z.ZodOptional<z.ZodBoolean>;
        animationRate: z.ZodOptional<z.ZodNumber>;
        animationFlow: z.ZodOptional<z.ZodEnum<{
            forward: "forward";
            reverse: "reverse";
            both: "both";
        }>>;
        layer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    rectangles: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        from: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        to: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        color: z.ZodOptional<z.ZodString>;
        colorValue: z.ZodOptional<z.ZodString>;
        outlineColor: z.ZodOptional<z.ZodString>;
        transparency: z.ZodOptional<z.ZodNumber>;
        zIndex: z.ZodOptional<z.ZodNumber>;
        group: z.ZodOptional<z.ZodString>;
        layer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    textBoxes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tile: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        content: z.ZodString;
        fontSize: z.ZodOptional<z.ZodNumber>;
        orientation: z.ZodOptional<z.ZodEnum<{
            X: "X";
            Y: "Y";
        }>>;
        group: z.ZodOptional<z.ZodString>;
        layer: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    groups: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodString>;
        group: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    lastUpdated: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>], "kind">;
export declare const layerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    visible: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const iconSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    url: z.ZodString;
    collection: z.ZodOptional<z.ZodString>;
    isIsometric: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const colorSchema: z.ZodObject<{
    id: z.ZodString;
    value: z.ZodString;
}, z.core.$strict>;
export declare const sceneShapeSchema: z.ZodObject<{
    $schema: z.ZodOptional<z.ZodString>;
    format: z.ZodLiteral<"accurona-scene">;
    version: z.ZodLiteral<1>;
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    units: z.ZodOptional<z.ZodEnum<{
        [x: string]: string;
    }>>;
    objects: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        element: z.ZodOptional<z.ZodString>;
        icon: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
        ports: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            kind: z.ZodOptional<z.ZodString>;
            props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
            links: z.ZodOptional<z.ZodArray<z.ZodObject<{
                source: z.ZodString;
                ref: z.ZodOptional<z.ZodString>;
                url: z.ZodOptional<z.ZodString>;
                label: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>>;
        links: z.ZodOptional<z.ZodArray<z.ZodObject<{
            source: z.ZodString;
            ref: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            label: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
    connections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        from: z.ZodString;
        fromPort: z.ZodOptional<z.ZodString>;
        to: z.ZodString;
        toPort: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
        links: z.ZodOptional<z.ZodArray<z.ZodObject<{
            source: z.ZodString;
            ref: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            label: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>>;
    views: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"plan">;
        floors: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            elevationMm: z.ZodOptional<z.ZodNumber>;
            wallHeightMm: z.ZodOptional<z.ZodNumber>;
            nodes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>>>;
            walls: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                from: z.ZodString;
                to: z.ZodString;
                exterior: z.ZodOptional<z.ZodBoolean>;
                layer: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
        placements: z.ZodOptional<z.ZodArray<z.ZodObject<{
            object: z.ZodString;
            floor: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            rotation: z.ZodOptional<z.ZodNumber>;
            mirror: z.ZodOptional<z.ZodObject<{
                x: z.ZodOptional<z.ZodBoolean>;
                y: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            mountMm: z.ZodOptional<z.ZodNumber>;
            size: z.ZodOptional<z.ZodObject<{
                w: z.ZodOptional<z.ZodNumber>;
                d: z.ZodOptional<z.ZodNumber>;
                h: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            attach: z.ZodOptional<z.ZodObject<{
                wall: z.ZodString;
            }, z.core.$strict>>;
            layer: z.ZodOptional<z.ZodString>;
            symbol: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>>;
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        lastUpdated: z.ZodOptional<z.ZodISODateTime>;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodEnum<{
            iso: "iso";
            schematic: "schematic";
        }>;
        placements: z.ZodOptional<z.ZodArray<z.ZodObject<{
            object: z.ZodString;
            tile: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            labelHeight: z.ZodOptional<z.ZodNumber>;
            group: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        connectors: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            connection: z.ZodOptional<z.ZodString>;
            anchors: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                ref: z.ZodUnion<readonly [z.ZodObject<{
                    object: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    anchor: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    tile: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, z.core.$strict>;
                }, z.core.$strict>]>;
            }, z.core.$strict>>;
            description: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                SOLID: "SOLID";
                DOTTED: "DOTTED";
                DASHED: "DASHED";
            }>>;
            direction: z.ZodOptional<z.ZodEnum<{
                START_TO_END: "START_TO_END";
                END_TO_START: "END_TO_START";
                BOTH: "BOTH";
                NONE: "NONE";
            }>>;
            glyph: z.ZodOptional<z.ZodEnum<{
                triangle: "triangle";
                chevron: "chevron";
                "double-chevron": "double-chevron";
                "circle-solid": "circle-solid";
                "circle-outline": "circle-outline";
                diamond: "diamond";
                square: "square";
                dollar: "dollar";
                bolt: "bolt";
                envelope: "envelope";
                person: "person";
                star: "star";
            }>>;
            animated: z.ZodOptional<z.ZodBoolean>;
            animationRate: z.ZodOptional<z.ZodNumber>;
            animationFlow: z.ZodOptional<z.ZodEnum<{
                forward: "forward";
                reverse: "reverse";
                both: "both";
            }>>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        rectangles: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            from: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            to: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            color: z.ZodOptional<z.ZodString>;
            colorValue: z.ZodOptional<z.ZodString>;
            outlineColor: z.ZodOptional<z.ZodString>;
            transparency: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            group: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        textBoxes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            tile: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            content: z.ZodString;
            fontSize: z.ZodOptional<z.ZodNumber>;
            orientation: z.ZodOptional<z.ZodEnum<{
                X: "X";
                Y: "Y";
            }>>;
            group: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        groups: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        lastUpdated: z.ZodOptional<z.ZodISODateTime>;
    }, z.core.$strict>], "kind">>>;
    layers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        visible: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>>;
    icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        url: z.ZodString;
        collection: z.ZodOptional<z.ZodString>;
        isIsometric: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>>;
    colors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>;
    links: z.ZodOptional<z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        ref: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
/** A whole scene: its structure, and every id reference resolving. */
export declare const sceneSchema: z.ZodObject<{
    $schema: z.ZodOptional<z.ZodString>;
    format: z.ZodLiteral<"accurona-scene">;
    version: z.ZodLiteral<1>;
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    units: z.ZodOptional<z.ZodEnum<{
        [x: string]: string;
    }>>;
    objects: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        element: z.ZodOptional<z.ZodString>;
        icon: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
        ports: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            kind: z.ZodOptional<z.ZodString>;
            props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
            links: z.ZodOptional<z.ZodArray<z.ZodObject<{
                source: z.ZodString;
                ref: z.ZodOptional<z.ZodString>;
                url: z.ZodOptional<z.ZodString>;
                label: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>>;
        links: z.ZodOptional<z.ZodArray<z.ZodObject<{
            source: z.ZodString;
            ref: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            label: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
    connections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        from: z.ZodString;
        fromPort: z.ZodOptional<z.ZodString>;
        to: z.ZodString;
        toPort: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        props: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
        links: z.ZodOptional<z.ZodArray<z.ZodObject<{
            source: z.ZodString;
            ref: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            label: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>>;
    views: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"plan">;
        floors: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            elevationMm: z.ZodOptional<z.ZodNumber>;
            wallHeightMm: z.ZodOptional<z.ZodNumber>;
            nodes: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>>>;
            walls: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                from: z.ZodString;
                to: z.ZodString;
                exterior: z.ZodOptional<z.ZodBoolean>;
                layer: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
        placements: z.ZodOptional<z.ZodArray<z.ZodObject<{
            object: z.ZodString;
            floor: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            rotation: z.ZodOptional<z.ZodNumber>;
            mirror: z.ZodOptional<z.ZodObject<{
                x: z.ZodOptional<z.ZodBoolean>;
                y: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            mountMm: z.ZodOptional<z.ZodNumber>;
            size: z.ZodOptional<z.ZodObject<{
                w: z.ZodOptional<z.ZodNumber>;
                d: z.ZodOptional<z.ZodNumber>;
                h: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            attach: z.ZodOptional<z.ZodObject<{
                wall: z.ZodString;
            }, z.core.$strict>>;
            layer: z.ZodOptional<z.ZodString>;
            symbol: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>>;
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        lastUpdated: z.ZodOptional<z.ZodISODateTime>;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodEnum<{
            iso: "iso";
            schematic: "schematic";
        }>;
        placements: z.ZodOptional<z.ZodArray<z.ZodObject<{
            object: z.ZodString;
            tile: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            labelHeight: z.ZodOptional<z.ZodNumber>;
            group: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        connectors: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            connection: z.ZodOptional<z.ZodString>;
            anchors: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                ref: z.ZodUnion<readonly [z.ZodObject<{
                    object: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    anchor: z.ZodString;
                }, z.core.$strict>, z.ZodObject<{
                    tile: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, z.core.$strict>;
                }, z.core.$strict>]>;
            }, z.core.$strict>>;
            description: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                SOLID: "SOLID";
                DOTTED: "DOTTED";
                DASHED: "DASHED";
            }>>;
            direction: z.ZodOptional<z.ZodEnum<{
                START_TO_END: "START_TO_END";
                END_TO_START: "END_TO_START";
                BOTH: "BOTH";
                NONE: "NONE";
            }>>;
            glyph: z.ZodOptional<z.ZodEnum<{
                triangle: "triangle";
                chevron: "chevron";
                "double-chevron": "double-chevron";
                "circle-solid": "circle-solid";
                "circle-outline": "circle-outline";
                diamond: "diamond";
                square: "square";
                dollar: "dollar";
                bolt: "bolt";
                envelope: "envelope";
                person: "person";
                star: "star";
            }>>;
            animated: z.ZodOptional<z.ZodBoolean>;
            animationRate: z.ZodOptional<z.ZodNumber>;
            animationFlow: z.ZodOptional<z.ZodEnum<{
                forward: "forward";
                reverse: "reverse";
                both: "both";
            }>>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        rectangles: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            from: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            to: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            color: z.ZodOptional<z.ZodString>;
            colorValue: z.ZodOptional<z.ZodString>;
            outlineColor: z.ZodOptional<z.ZodString>;
            transparency: z.ZodOptional<z.ZodNumber>;
            zIndex: z.ZodOptional<z.ZodNumber>;
            group: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        textBoxes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            tile: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            content: z.ZodString;
            fontSize: z.ZodOptional<z.ZodNumber>;
            orientation: z.ZodOptional<z.ZodEnum<{
                X: "X";
                Y: "Y";
            }>>;
            group: z.ZodOptional<z.ZodString>;
            layer: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        groups: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        lastUpdated: z.ZodOptional<z.ZodISODateTime>;
    }, z.core.$strict>], "kind">>>;
    layers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        visible: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>>;
    icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        url: z.ZodString;
        collection: z.ZodOptional<z.ZodString>;
        isIsometric: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>>;
    colors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>;
    links: z.ZodOptional<z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        ref: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export type Scene = z.infer<typeof sceneShapeSchema>;
export type SceneObject = z.infer<typeof sceneObjectSchema>;
export type Port = z.infer<typeof portSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type ExternalLink = z.infer<typeof externalLinkSchema>;
export type View = z.infer<typeof viewSchema>;
export type PlanView = z.infer<typeof planViewSchema>;
export type DiagramView = z.infer<typeof diagramViewSchema>;
export type Floor = z.infer<typeof floorSchema>;
export type WallNode = z.infer<typeof wallNodeSchema>;
export type Wall = z.infer<typeof wallSchema>;
export type PlanPlacement = z.infer<typeof planPlacementSchema>;
export type DiagramPlacement = z.infer<typeof diagramPlacementSchema>;
export type Tile = z.infer<typeof tileSchema>;
export type Anchor = z.infer<typeof anchorSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type Rectangle = z.infer<typeof rectangleSchema>;
export type TextBox = z.infer<typeof textBoxSchema>;
export type Group = z.infer<typeof groupSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type Icon = z.infer<typeof iconSchema>;
export type Color = z.infer<typeof colorSchema>;
