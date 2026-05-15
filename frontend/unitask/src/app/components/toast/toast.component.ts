import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item animate-slide-in" [class]="toast.type">
          <span class="material-icons-round icon">
            {{ getIcon(toast.type) }}
          </span>
          <span class="message">{{ toast.message }}</span>
          <button class="close-btn" (click)="toastService.remove(toast.id)">
            <span class="material-icons-round">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      background: var(--bg-card);
      color: var(--text-primary);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      border-left: 4px solid transparent;
      min-width: 300px;
      max-width: 400px;
      backdrop-filter: blur(10px);
    }

    .toast-item.success { border-left-color: var(--success); }
    .toast-item.error { border-left-color: var(--error); }
    .toast-item.warning { border-left-color: var(--warning); }
    .toast-item.info { border-left-color: var(--primary); }

    .icon { font-size: 20px; }
    .toast-item.success .icon { color: var(--success); }
    .toast-item.error .icon { color: var(--error); }
    .toast-item.warning .icon { color: var(--warning); }
    .toast-item.info .icon { color: var(--primary); }

    .message {
      flex: 1;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: rgba(255,255,255,0.1);
      color: var(--text-primary);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .animate-slide-in {
      animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}
