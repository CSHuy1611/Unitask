import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="payment-result-page">
      <div class="container" style="max-width: 600px; text-align: center;">
        <div class="glass-card animate-fade-in-up" style="padding: var(--space-10)">
          <span class="material-icons-round error-icon">cancel</span>
          <h1 style="font-size: var(--font-size-3xl); font-weight: 800; margin-bottom: var(--space-4); color: var(--error)">
            Thanh toán bị hủy
          </h1>
          <p style="color: var(--text-secondary); margin-bottom: var(--space-8); font-size: var(--font-size-lg)">
            Bạn đã hủy giao dịch hoặc có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại sau.
          </p>
          
          <div class="actions" style="display: flex; gap: var(--space-4); justify-content: center">
            <a routerLink="/pricing" class="btn btn-primary btn-lg">
              <span class="material-icons-round">refresh</span> Thử lại
            </a>
            <a routerLink="/employer/dashboard" class="btn btn-secondary btn-lg">
              <span class="material-icons-round">dashboard</span> Về Dashboard
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

    .error-icon {
      font-size: 80px;
      color: var(--error); /* Needs to be defined or fallback */
      margin-bottom: var(--space-6);
      animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes scaleIn {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class PaymentCancelComponent {}
