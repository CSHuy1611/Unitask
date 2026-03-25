import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="container header-inner">
        <a routerLink="/" class="logo">
          <svg class="logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 30 20 L 30 70 A 20 20 0 0 0 70 70 L 70 45" stroke="url(#logoGrad)" stroke-width="22" stroke-linecap="round"/>
            <circle cx="70" cy="18" r="11" fill="#1CD4D4"/>
            <defs>
              <linearGradient id="logoGrad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#E1FAF7"/>
                <stop offset="100%" stop-color="#24D3CE"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="logo-text">Uni<span class="logo-accent">Task</span></span>
        </a>

        <nav class="nav" [class.nav-open]="menuOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link" (click)="closeMenu()">
            <span class="material-icons-round nav-icon">home</span> Trang chủ
          </a>
          <a routerLink="/jobs" routerLinkActive="active" class="nav-link" (click)="closeMenu()">
            <span class="material-icons-round nav-icon">work</span> Việc làm
          </a>

          @if (auth.isLoggedIn()) {
            @if (auth.isAdmin()) {
              <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-link" (click)="closeMenu()">
                <span class="material-icons-round nav-icon">admin_panel_settings</span> Admin Panel
              </a>
            }
            @if (auth.isEmployer()) {
              <a routerLink="/employer/dashboard" routerLinkActive="active" class="nav-link" (click)="closeMenu()">
                <span class="material-icons-round nav-icon">dashboard</span> Dashboard
              </a>
              <a routerLink="/pricing" routerLinkActive="active" class="nav-link" (click)="closeMenu()" style="color:var(--primary-light)">
                <span class="material-icons-round nav-icon">account_balance_wallet</span> Nạp tiền
              </a>
            }
            <a routerLink="/profile" routerLinkActive="active" class="nav-link" (click)="closeMenu()">
              <span class="material-icons-round nav-icon">person</span> Hồ sơ
            </a>
          }
        </nav>

        <div class="header-actions">
          @if (auth.isLoggedIn()) {
            <div class="user-menu">
              <div class="user-avatar">{{ auth.currentUser()?.avatar }}</div>
              <span class="user-name">{{ auth.currentUser()?.fullName }}</span>
              <button class="btn btn-secondary btn-sm" (click)="onLogout()">
                <span class="material-icons-round" style="font-size:16px">logout</span> Đăng xuất
              </button>
            </div>
          } @else {
            <a routerLink="/login" class="btn btn-secondary btn-sm">Đăng nhập</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Đăng ký</a>
          }

          <button class="hamburger" (click)="toggleMenu()" [class.hamburger-open]="menuOpen()">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-light);
      padding: var(--space-3) 0;
    }

    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-8);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      flex-shrink: 0;
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

    .nav {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      flex: 1;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      font-weight: 500;
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
      text-decoration: none;
      white-space: nowrap;
    }

    .nav-link:hover {
      color: var(--text-primary);
      background: var(--bg-glass);
    }

    .nav-link.active {
      color: var(--primary-light);
      background: rgba(79, 70, 229, 0.1);
    }

    .nav-icon { font-size: 18px; }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: white;
    }

    .user-name {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-primary);
    }

    .hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      background: none;
      padding: var(--space-2);
    }

    .hamburger span {
      width: 24px;
      height: 2px;
      background: var(--text-primary);
      border-radius: 2px;
      transition: all var(--transition-base);
    }

    .hamburger-open span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
    .hamburger-open span:nth-child(2) { opacity: 0; }
    .hamburger-open span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

    @media (max-width: 768px) {
      .hamburger { display: flex; }

      .nav {
        position: fixed;
        top: 60px;
        left: 0;
        right: 0;
        background: var(--bg-secondary);
        flex-direction: column;
        padding: var(--space-4);
        gap: var(--space-2);
        transform: translateY(-110%);
        transition: transform var(--transition-base);
        border-bottom: 1px solid var(--border-light);
      }

      .nav-open { transform: translateY(0); }

      .nav-link {
        width: 100%;
        padding: var(--space-3) var(--space-4);
      }

      .user-name { display: none; }
    }
  `]
})
export class HeaderComponent {
  auth = inject(AuthService);
  menuOpen = signal(false);

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }

  onLogout() {
    this.auth.logout();
    this.closeMenu();
  }
}
