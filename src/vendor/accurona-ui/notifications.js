const AUTO_HIDE_MS = 4000;
export function createNotifier() {
    let items = [];
    let nextId = 1;
    const timers = new Map();
    const listeners = new Set();
    const emit = () => listeners.forEach((l) => l());
    const dismiss = (id) => {
        clearTimeout(timers.get(id));
        timers.delete(id);
        if (!items.some((n) => n.id === id))
            return;
        items = items.filter((n) => n.id !== id);
        emit();
    };
    return {
        notify(options) {
            const id = nextId++;
            items = [
                ...items,
                { ...options, id, severity: options.severity ?? 'info' }
            ];
            const autoHide = options.autoHide ?? AUTO_HIDE_MS;
            if (autoHide !== false) {
                timers.set(id, setTimeout(() => dismiss(id), autoHide));
            }
            emit();
            return id;
        },
        dismiss,
        clear() {
            timers.forEach((t) => clearTimeout(t));
            timers.clear();
            if (items.length === 0)
                return;
            items = [];
            emit();
        },
        get: () => items,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
}
/** The page's notifications, used by the functions below. */
export const defaultNotifier = createNotifier();
export function notify(options) {
    return defaultNotifier.notify(options);
}
export function dismissNotification(id) {
    defaultNotifier.dismiss(id);
}
export function clearNotifications() {
    defaultNotifier.clear();
}
export function getNotifications() {
    return defaultNotifier.get();
}
export function subscribeNotifications(listener) {
    return defaultNotifier.subscribe(listener);
}
