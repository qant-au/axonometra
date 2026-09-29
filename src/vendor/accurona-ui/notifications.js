const AUTO_HIDE_MS = 4000;
let items = [];
let nextId = 1;
const timers = new Map();
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
export function notify(options) {
    const id = nextId++;
    items = [...items, { ...options, id, severity: options.severity ?? 'info' }];
    const autoHide = options.autoHide ?? AUTO_HIDE_MS;
    if (autoHide !== false) {
        timers.set(id, setTimeout(() => dismissNotification(id), autoHide));
    }
    emit();
    return id;
}
export function dismissNotification(id) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    if (!items.some((n) => n.id === id))
        return;
    items = items.filter((n) => n.id !== id);
    emit();
}
export function clearNotifications() {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    if (items.length === 0)
        return;
    items = [];
    emit();
}
export function getNotifications() {
    return items;
}
export function subscribeNotifications(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
