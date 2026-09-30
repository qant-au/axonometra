import type { ReactNode } from 'react';
export type Severity = 'info' | 'success' | 'warning' | 'error';
export interface NotifyOptions {
    message: ReactNode;
    title?: ReactNode;
    severity?: Severity;
    icon?: ReactNode;
    autoHide?: number | false;
}
export interface Notification extends NotifyOptions {
    id: number;
    severity: Severity;
}
/** One set of notifications and the functions that change it. */
export interface Notifier {
    notify(options: NotifyOptions): number;
    dismiss(id: number): void;
    clear(): void;
    get(): readonly Notification[];
    subscribe(listener: () => void): () => void;
}
export declare function createNotifier(): Notifier;
/** The page's notifications, used by the functions below. */
export declare const defaultNotifier: Notifier;
export declare function notify(options: NotifyOptions): number;
export declare function dismissNotification(id: number): void;
export declare function clearNotifications(): void;
export declare function getNotifications(): readonly Notification[];
export declare function subscribeNotifications(listener: () => void): () => void;
