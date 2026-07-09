import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'info', duration: number = 3000) {
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts.update(current => [...current, { id, message, type }]);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  success(message: string, duration?: number) { this.show(message, 'success', duration); }
  error(message: string, duration?: number) { this.show(message, 'error', duration); }
  warning(message: string, duration?: number) { this.show(message, 'warning', duration); }
  info(message: string, duration?: number) { this.show(message, 'info', duration); }

  remove(id: string) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
