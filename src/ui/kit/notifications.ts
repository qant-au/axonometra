import type { ReactNode } from 'react';

// Transient messages ("Saved", "Wall drawing mode"). A store outside React, so
// plain classes can raise one; <NotificationHost /> shows them. notify() and
// the functions beside it use one store for the page. An app with more than
// one editor on a page gives each its own (createNotifier), so an editor's
// messages show in that editor only.

export type Severity = 'info' | 'success' | 'warning' | 'error';

export interface NotifyOptions {
  message: ReactNode;
  title?: ReactNode;
  severity?: Severity;
  icon?: ReactNode;
  // Milliseconds before it goes by itself; false keeps it until closed.
  autoHide?: number | false;
}

export interface Notification extends NotifyOptions {
  id: number;
  severity: Severity;
}

const AUTO_HIDE_MS = 4000;

/** One set of notifications and the functions that change it. */
export interface Notifier {
  notify(options: NotifyOptions): number;
  dismiss(id: number): void;
  clear(): void;
  get(): readonly Notification[];
  subscribe(listener: () => void): () => void;
}

export function createNotifier(): Notifier {
  let items: readonly Notification[] = [];
  let nextId = 1;
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const dismiss = (id: number) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    if (!items.some((n) => n.id === id)) return;
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
        timers.set(
          id,
          setTimeout(() => dismiss(id), autoHide)
        );
      }
      emit();
      return id;
    },
    dismiss,
    clear() {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      if (items.length === 0) return;
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
export const defaultNotifier: Notifier = createNotifier();

export function notify(options: NotifyOptions): number {
  return defaultNotifier.notify(options);
}

export function dismissNotification(id: number): void {
  defaultNotifier.dismiss(id);
}

export function clearNotifications(): void {
  defaultNotifier.clear();
}

export function getNotifications(): readonly Notification[] {
  return defaultNotifier.get();
}

export function subscribeNotifications(listener: () => void): () => void {
  return defaultNotifier.subscribe(listener);
}
