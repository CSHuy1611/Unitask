import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="logo">
              <svg class="logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 30 20 L 30 70 A 20 20 0 0 0 70 70 L 70 45" stroke="url(#logoGradFooter)" stroke-width="22" stroke-linecap="round"/>
                <circle cx="70" cy="18" r="11" fill="#1CD4D4"/>
                <defs>
                  <linearGradient id="logoGradFooter" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#E1FAF7"/>
                    <stop offset="100%" stop-color="#24D3CE"/>
                  </linearGradient>
                </defs>
              </svg>
              <span class="logo-text">Uni<span class="logo-accent">Task</span></span>
              
            </div>
            <p class="footer-desc">
              Nền tảng kết nối việc làm nhanh chóng dành cho sinh viên. Tìm kiếm cơ hội thực tập, part-time và freelance từ các doanh nghiệp uy tín.
            </p>
            <div class="social-links">
              <a href="#" class="social-link">
                <span class="material-icons-round">language</span>
              </a>
              <a href="#" class="social-link">
                <span class="material-icons-round">mail</span>
              </a>
              <a href="#" class="social-link">
                <span class="material-icons-round">phone</span>
              </a>
            </div>
          </div>

          <div class="footer-col">
            <h4 class="footer-title">Sinh viên</h4>
            <a routerLink="/jobs" class="footer-link">Tìm việc làm</a>
            <a routerLink="/register" class="footer-link">Đăng ký tài khoản</a>
            <a routerLink="/profile" class="footer-link">Xác thực eKYC</a>
          </div>

          <div class="footer-col">
            <h4 class="footer-title">Doanh nghiệp</h4>
            <a routerLink="/register" class="footer-link">Đăng ký tuyển dụng</a>
            <a routerLink="/employer/dashboard" class="footer-link">Đăng việc làm</a>
            <a href="#" class="footer-link">Gói dịch vụ</a>
          </div>

          <div class="footer-col">
            <h4 class="footer-title">Về UniTask</h4>
            <a href="#" class="footer-link">Giới thiệu</a>
            <a href="#" class="footer-link">Điều khoản sử dụng</a>
            <a href="#" class="footer-link">Chính sách bảo mật</a>
            <a href="#" class="footer-link">Liên hệ</a>
          </div>
        </div>

        <div class="footer-bottom">
          <p>&copy; 2026 UniTask. Tất cả quyền được bảo lưu.</p>
          <p class="footer-note">Made with ❤️ for Vietnamese students</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-light);
      padding: var(--space-16) 0 var(--space-8);
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: var(--space-10);
      margin-bottom: var(--space-10);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: var(--space-4);
      text-decoration: none;
    }

    .logo:hover { opacity: 0.9; }
    
    .logo-icon { 
      width: 40px; 
      height: 40px; 
      display: flex;
    }

    .logo-text {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: white;
      line-height: 1;
    }

    .logo-accent {
      background: linear-gradient(135deg, #E1FAF7, #24D3CE);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .footer-desc {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      line-height: 1.8;
      margin-bottom: var(--space-5);
    }

    .social-links {
      display: flex;
      gap: var(--space-3);
    }

    .social-link {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-lg);
      background: var(--bg-glass);
      border: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }

    .social-link:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      transform: translateY(-2px);
    }

    .social-link .material-icons-round { font-size: 20px; }

    .footer-title {
      font-size: var(--font-size-sm);
      font-weight: 700;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-5);
    }

    .footer-col {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .footer-link {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      transition: all var(--transition-fast);
      text-decoration: none;
    }

    .footer-link:hover {
      color: var(--primary-light);
      padding-left: var(--space-2);
    }

    .footer-bottom {
      border-top: 1px solid var(--border-light);
      padding-top: var(--space-6);
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-muted);
      font-size: var(--font-size-sm);
    }

    .footer-note { color: var(--text-muted); }

    @media (max-width: 768px) {
      .footer-grid {
        grid-template-columns: 1fr 1fr;
        gap: var(--space-8);
      }

      .footer-brand { grid-column: 1 / -1; }

      .footer-bottom {
        flex-direction: column;
        gap: var(--space-2);
        text-align: center;
      }
    }

    @media (max-width: 480px) {
      .footer-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class FooterComponent { }
