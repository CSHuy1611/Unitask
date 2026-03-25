import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="auth-page">
      <div class="auth-bg"></div>
      <div class="container">
        <div class="auth-card glass-card animate-fade-in-up">
          <div class="auth-header">
            <div class="auth-icon">
              <span class="material-icons-round">lock_open</span>
            </div>
            <h1>Đăng nhập</h1>
            <p>Chào mừng bạn trở lại UniTask</p>
          </div>

          @if (errorMsg()) {
            <div class="alert alert-error animate-fade-in">
              <span class="material-icons-round">error</span>
              {{ errorMsg() }}
            </div>
          }

          @if (successMsg()) {
            <div class="alert alert-success animate-fade-in">
              <span class="material-icons-round">check_circle</span>
              {{ successMsg() }}
            </div>
          }

          <form (ngSubmit)="onLogin()" class="auth-form">
            <div class="form-group">
              <label class="form-label">Email</label>
              <div class="input-icon">
                <span class="material-icons-round">email</span>
                <input type="email" class="form-input" placeholder="your@email.com"
                       [(ngModel)]="email" name="email" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Mật khẩu</label>
              <div class="input-icon">
                <span class="material-icons-round">lock</span>
                <input type="password" class="form-input" placeholder="••••••••"
                       [(ngModel)]="password" name="password" required>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg full-width" [disabled]="loading()">
              @if (loading()) {
                <span class="spinner"></span> Đang xử lý...
              } @else {
                <span class="material-icons-round">login</span> Đăng nhập
              }
            </button>
          </form>

          <div class="auth-footer">
            <p>Chưa có tài khoản? <a routerLink="/register">Đăng ký ngay</a></p>
          </div>

          <div class="demo-accounts">
            <p class="demo-title">🧪 Tài khoản demo:</p>
            <div class="demo-list">
              <button class="demo-btn" (click)="fillDemo('student@unitask.vn', '123456')">
                🎓 Student: student&#64;unitask.vn
              </button>
              <button class="demo-btn" (click)="fillDemo('employer@unitask.vn', '123456')">
                🏢 Employer: employer&#64;unitask.vn
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .auth-page {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: calc(80px + var(--space-10)) 0 var(--space-10);
    }

    .auth-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 30% 20%, rgba(79, 70, 229, 0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(124, 58, 237, 0.08) 0%, transparent 50%);
    }

    .auth-card {
      position: relative;
      max-width: 440px;
      margin: 0 auto;
      padding: var(--space-10);
    }

    .auth-header {
      text-align: center;
      margin-bottom: var(--space-8);
    }

    .auth-icon {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-xl);
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto var(--space-5);
    }

    .auth-icon .material-icons-round {
      font-size: 28px;
      color: white;
    }

    .auth-header h1 {
      font-size: var(--font-size-2xl);
      font-weight: 800;
      margin-bottom: var(--space-2);
    }

    .auth-header p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }

    .alert {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-lg);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-5);
    }

    .alert .material-icons-round { font-size: 20px; }

    .alert-error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .input-icon {
      position: relative;
    }

    .input-icon .material-icons-round {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 20px;
      color: var(--text-muted);
    }

    .input-icon .form-input {
      padding-left: 44px;
    }

    .full-width { width: 100%; }

    .spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .auth-footer {
      text-align: center;
      margin-top: var(--space-6);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .auth-footer a { font-weight: 600; }

    .demo-accounts {
      margin-top: var(--space-6);
      padding-top: var(--space-5);
      border-top: 1px solid var(--border-light);
    }

    .demo-title {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      text-align: center;
      margin-bottom: var(--space-3);
    }

    .demo-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .demo-btn {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      background: var(--bg-glass);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      text-align: left;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .demo-btn:hover {
      background: rgba(79, 70, 229, 0.1);
      border-color: var(--primary-light);
      color: var(--primary-light);
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  fillDemo(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  onLogin() {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.loading.set(true);

    setTimeout(() => {
      const result = this.auth.login(this.email, this.password);
      this.loading.set(false);

      if (result.success) {
        this.successMsg.set(result.message);
        setTimeout(() => {
          const user = this.auth.currentUser();
          if (user?.role === 'employer') {
            this.router.navigate(['/employer/dashboard']);
          } else {
            this.router.navigate(['/']);
          }
        }, 500);
      } else {
        this.errorMsg.set(result.message);
      }
    }, 800);
  }
}
