const omit = (value, keys) => {
    const out = { ...value };
    for (const key of keys)
        delete out[key];
    return out;
};
const pick = (from, keys) => {
    const out = {};
    if (!from || !keys)
        return out;
    for (const key of keys)
        if (from[key] !== undefined)
            out[key] = from[key];
    return out;
};
// Keeps fields the editor does not model on entities that still exist.
function keepFields(edited, opened, key, fields) {
    if (!edited || !fields?.length || !opened)
        return edited;
    const before = new Map(opened.map((item) => [key(item), item]));
    return edited.map((item) => ({
        ...pick(before.get(key(item)), fields),
        ...item
    }));
}
function preserveInView(view, opened, keep) {
    if (!opened ||
        (opened.kind !== view.kind &&
            !(opened.kind !== 'plan' && view.kind !== 'plan'))) {
        return view;
    }
    if (view.kind === 'plan' && opened.kind === 'plan') {
        const openedFloors = new Map(opened.floors.map((f) => [f.id, f]));
        return {
            ...view,
            floors: view.floors.map((floor) => {
                const before = openedFloors.get(floor.id);
                return {
                    ...pick(before, keep.floor),
                    ...floor,
                    walls: keepFields(floor.walls, before?.walls, (w) => w.id, keep.wall)
                };
            }),
            placements: keepFields(view.placements, opened.placements, (p) => p.object, keep.placement)
        };
    }
    if (view.kind !== 'plan' && opened.kind !== 'plan') {
        return {
            ...view,
            placements: keepFields(view.placements, opened.placements, (p) => p.object, keep.placement),
            connectors: keepFields(view.connectors, opened.connectors, (c) => c.id, keep.connector),
            rectangles: keepFields(view.rectangles, opened.rectangles, (r) => r.id, keep.rectangle),
            textBoxes: keepFields(view.textBoxes, opened.textBoxes, (t) => t.id, keep.textBox),
            groups: keepFields(view.groups, opened.groups, (g) => g.id, keep.group)
        };
    }
    return view;
}
const placedIn = (view) => (view.placements ?? []).map((p) => p.object);
/**
 * The scene to save: `opened` (the scene the editor loaded) with the
 * editor's part replaced by `update`.
 *
 * - Views of the editor's kinds are replaced; others are kept.
 * - An object the editor had placed and has now removed from all of its views
 *   is deleted, unless another view still places it. Objects the editor never
 *   placed (in another editor's views, or in no view at all) are kept.
 * - Connections whose objects or ports are gone are dropped, and so is a
 *   connector's `connection` that no longer exists.
 */
export function mergeScene(opened, update) {
    const owned = new Set(update.viewKinds);
    const keptViews = (opened.views ?? []).filter((v) => !owned.has(v.kind));
    const openedById = new Map((opened.views ?? []).map((v) => [v.id, v]));
    const editedViews = update.views.map((v) => preserveInView(v, openedById.get(v.id), update.preserve ?? {}));
    const placedElsewhere = new Set(keptViews.flatMap(placedIn));
    const placedByEditorBefore = new Set((opened.views ?? []).filter((v) => owned.has(v.kind)).flatMap(placedIn));
    const edited = new Map(update.objects.map((o) => [o.id, o]));
    const objects = [];
    const seen = new Set();
    for (const before of opened.objects) {
        const mine = edited.get(before.id);
        if (mine) {
            objects.push({ ...omit(before, update.objectFields), ...mine });
        }
        else if (!placedByEditorBefore.has(before.id) ||
            placedElsewhere.has(before.id)) {
            objects.push(before);
        }
        seen.add(before.id);
    }
    for (const object of update.objects) {
        if (!seen.has(object.id))
            objects.push(object);
    }
    const ports = new Map(objects.map((o) => [o.id, new Set((o.ports ?? []).map((p) => p.id))]));
    const endOk = (object, port) => ports.has(object) && (port === undefined || ports.get(object).has(port));
    const connections = (opened.connections ?? []).filter((c) => endOk(c.from, c.fromPort) && endOk(c.to, c.toPort));
    const connectionIds = new Set(connections.map((c) => c.id));
    const views = [...keptViews, ...editedViews].map((view) => view.kind === 'plan'
        ? view
        : {
            ...view,
            connectors: view.connectors?.map((c) => c.connection !== undefined && !connectionIds.has(c.connection)
                ? omit(c, ['connection'])
                : c)
        });
    // Keep the order the views were in; new ones go last.
    const order = new Map((opened.views ?? []).map((v, i) => [v.id, i]));
    views.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
    // An icon the editor does not list may still be used by a kept object.
    let icons = update.set?.icons ?? opened.icons;
    if (update.set?.icons) {
        const listed = new Set(update.set.icons.map((i) => i.id));
        const needed = new Set(objects
            .map((o) => o.icon)
            .filter((i) => !!i && !listed.has(i)));
        icons = [
            ...update.set.icons,
            ...(opened.icons ?? []).filter((i) => needed.has(i.id))
        ];
    }
    const scene = {
        ...opened,
        ...update.set,
        objects,
        views,
        ...(icons !== undefined ? { icons } : {}),
        ...(connections.length || opened.connections ? { connections } : {})
    };
    if (!connections.length && !opened.connections)
        delete scene.connections;
    return scene;
}
