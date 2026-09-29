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
export declare function notify(options: NotifyOptions): number;
export declare function dismissNotification(id: number): void;
export declare function clearNotifications(): void;
export declare function getNotifications(): readonly Notification[];
export declare function subscribeNotifications(listener: () => void): () => void;
