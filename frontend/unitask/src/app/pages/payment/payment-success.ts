import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { API_BASE_URL } from '../../config/api.config';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <section class="payment-result-page">
      <div class="container" style="max-width: 600px; text-align: center;">
        <div class="glass-card animate-fade-in-up" style="padding: var(--space-10)">
          <span class="material-icons-round success-icon">check_circle</span>
          <h1 style="font-size: var(--font-size-3xl); font-weight: 800; margin-bottom: var(--space-4); color: var(--success)">
            Thanh toán thành công!
          </h1>
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4); font-size: var(--font-size-lg)">
            Giao dịch của bạn đã được xử lý. Cảm ơn bạn đã sử dụng dịch vụ của UniTask.
          </p>
          
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-lg); padding: var(--space-4); margin-bottom: var(--space-8); display: inline-block; min-width: 250px;">
            <p style="margin: 0; font-size: var(--font-size-sm); color: var(--text-muted)">Số dư tài khoản hiện tại</p>
            @if (isVerifying) {
              <strong style="font-size: var(--font-size-2xl); color: var(--text-muted)">Đang cập nhật...</strong>
            } @else {
              <strong style="font-size: var(--font-size-2xl); color: var(--primary-light)">
                {{ (auth.currentUser()?.balance || 0).toLocaleString('vi-VN') }}đ
              </strong>
            }
          </div>
          
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
export class PaymentSuccessComponent implements OnInit {
  auth = inject(AuthService);
  route = inject(ActivatedRoute);
  http = inject(HttpClient);
  isVerifying = true;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const orderCode = params['orderCode'];
      if (orderCode) {
        this.http.get(`${API_BASE_URL}/payment/verify-local/${orderCode}`).subscribe({
          next: () => {
            this.auth.fetchBalance().subscribe(() => this.isVerifying = false);
          },
          error: () => {
            this.auth.fetchBalance().subscribe(() => this.isVerifying = false);
          }
        });
      } else {
        this.auth.fetchBalance().subscribe(() => this.isVerifying = false);
      }
    });
  }
}
