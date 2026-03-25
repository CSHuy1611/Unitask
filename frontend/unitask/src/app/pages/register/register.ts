import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="auth-page">
      <div class="auth-bg"></div>
      <div class="container">
        <div class="auth-card glass-card animate-fade-in-up">
          <div class="auth-header">
            <div class="auth-icon">
              <span class="material-icons-round">person_add</span>
            </div>
            <h1>Đăng ký tài khoản</h1>
            <p>Tham gia UniTask để bắt đầu hành trình của bạn</p>
          </div>

          <!-- Role Tabs -->
          <div class="role-tabs">
            <button class="role-tab" [class.active]="activeRole() === 'student'" (click)="activeRole.set('student')">
              🎓 Sinh viên
            </button>
            <button class="role-tab" [class.active]="activeRole() === 'employer'" (click)="activeRole.set('employer')">
              🏢 Doanh nghiệp
            </button>
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

          <form (ngSubmit)="onRegister()" class="auth-form">
            <!-- Common fields -->
            <div class="form-group">
              <label class="form-label">Họ và tên</label>
              <input type="text" class="form-input" placeholder="Nhập họ và tên"
                     [(ngModel)]="fullName" name="fullName" required>
            </div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" placeholder="your@email.com"
                     [(ngModel)]="email" name="email" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Mật khẩu</label>
                <input type="password" class="form-input" placeholder="••••••••"
                       [(ngModel)]="password" name="password" required>
              </div>
              <div class="form-group">
                <label class="form-label">Số điện thoại</label>
                <input type="tel" class="form-input" placeholder="0901234567"
                       [(ngModel)]="phone" name="phone" required>
              </div>
            </div>

            <!-- Student fields -->
            @if (activeRole() === 'student') {
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Trường đại học</label>
                  <input type="text" class="form-input" placeholder="VD: Đại học FPT"
                         [(ngModel)]="university" name="university">
                </div>
                <div class="form-group">
                  <label class="form-label">Ngành học</label>
                  <input type="text" class="form-input" placeholder="VD: Kỹ thuật phần mềm"
                         [(ngModel)]="major" name="major">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Năm học</label>
                <select class="form-select" [(ngModel)]="year" name="year">
                  <option [ngValue]="1">Năm 1</option>
                  <option [ngValue]="2">Năm 2</option>
                  <option [ngValue]="3">Năm 3</option>
                  <option [ngValue]="4">Năm 4</option>
                  <option [ngValue]="5">Năm 5+</option>
                </select>
              </div>
            }

            <!-- Employer fields -->
            @if (activeRole() === 'employer') {
              <div class="form-group">
                <label class="form-label">Tên công ty</label>
                <input type="text" class="form-input" placeholder="VD: FPT Software"
                       [(ngModel)]="companyName" name="companyName">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Chức vụ</label>
                  <input type="text" class="form-input" placeholder="VD: HR Manager"
                         [(ngModel)]="position" name="position">
                </div>
                <div class="form-group">
                  <label class="form-label">Mã số thuế</label>
                  <input type="text" class="form-input" placeholder="VD: 0101234567"
                         [(ngModel)]="taxCode" name="taxCode">
                </div>
              </div>
            }

            <button type="submit" class="btn btn-primary btn-lg full-width" [disabled]="loading()">
              @if (loading()) {
                <span class="spinner"></span> Đang xử lý...
              } @else {
                Đăng ký {{ activeRole() === 'student' ? 'Sinh viên' : 'Doanh nghiệp' }}
              }
            </button>
          </form>

          <div class="auth-footer">
            <p>Đã có tài khoản? <a routerLink="/login">Đăng nhập</a></p>
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
      max-width: 520px;
      margin: 0 auto;
      padding: var(--space-10);
    }

    .auth-header {
      text-align: center;
      margin-bottom: var(--space-6);
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

    .role-tabs {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-6);
      padding: var(--space-1);
      background: var(--bg-secondary);
      border-radius: var(--radius-xl);
    }

    .role-tab {
      flex: 1;
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-secondary);
      background: none;
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
    }

    .role-tab.active {
      background: var(--primary-gradient);
      color: white;
      box-shadow: var(--shadow-glow);
    }

    .role-tab:hover:not(.active) {
      color: var(--text-primary);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
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

    @media (max-width: 480px) {
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  activeRole = signal<'student' | 'employer'>('student');
  loading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  // Common
  fullName = '';
  email = '';
  password = '';
  phone = '';

  // Student
  university = '';
  major = '';
  year = 3;

  // Employer
  companyName = '';
  position = '';
  taxCode = '';

  onRegister() {
    this.errorMsg.set('');
    this.successMsg.set('');

    if (!this.fullName || !this.email || !this.password) {
      this.errorMsg.set('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    this.loading.set(true);

    setTimeout(() => {
      const result = this.auth.register({
        role: this.activeRole(),
        fullName: this.fullName,
        email: this.email,
        password: this.password,
        phone: this.phone,
        university: this.university,
        major: this.major,
        year: this.year,
        companyName: this.companyName,
        position: this.position,
      });

      this.loading.set(false);

      if (result.success) {
        this.successMsg.set(result.message);
        setTimeout(() => this.router.navigate(['/']), 1000);
      } else {
        this.errorMsg.set(result.message);
      }
    }, 800);
  }
}
