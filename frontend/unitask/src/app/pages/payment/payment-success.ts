import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="payment-result-page">
      <div class="container" style="max-width: 600px; text-align: center;">
        <div class="glass-card animate-fade-in-up" style="padding: var(--space-10)">
          <span class="material-icons-round success-icon">check_circle</span>
          <h1 style="font-size: var(--font-size-3xl); font-weight: 800; margin-bottom: var(--space-4); color: var(--success)">
            Thanh toán thành công!
          </h1>
          <p style="color: var(--text-secondary); margin-bottom: var(--space-8); font-size: var(--font-size-lg)">
            Giao dịch của bạn đã được xử lý. Cảm ơn bạn đã sử dụng dịch vụ của UniTask.
          </p>
          
          <div class="actions" style="display: flex; gap: var(--space-4); justify-content: center">
            <a routerLink="/employer/dashboard" class="btn btn-primary btn-lg">
              <span class="material-icons-round">dashboard</span> Về Dashboard
            </a>
            <a routerLink="/jobs" class="btn btn-secondary btn-lg">
              <span class="material-icons-round">work</span> Xem việc làm
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .payment-result-page {
      padding: calc(80px + var(--space-12)) 0 var(--space-16);
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-icon {
      font-size: 80px;
      color: var(--success);
      margin-bottom: var(--space-6);
      animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes scaleIn {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class PaymentSuccessComponent {}
