import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="header-bar">
        <!-- LEFT: Logo -->
        <a routerLink="/" class="logo" (click)="closeMenu()">
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

        <!-- CENTER: Desktop nav links -->
        <nav class="desktop-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
            <span class="material-icons-round nav-icon">home</span> Trang chủ
          </a>
          <a routerLink="/jobs" routerLinkActive="active" class="nav-link">
            <span class="material-icons-round nav-icon">work</span> Việc làm
          </a>
          @if (auth.isLoggedIn()) {
            @if (auth.isAdmin()) {
              <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-link">
                <span class="material-icons-round nav-icon">admin_panel_settings</span> Admin Panel
              </a>
            }
            @if (auth.isEmployer()) {
              <a routerLink="/employer/dashboard" routerLinkActive="active" class="nav-link">
                <span class="material-icons-round nav-icon">dashboard</span> Dashboard
              </a>
              <a routerLink="/pricing" routerLinkActive="active" class="nav-link" style="color:var(--primary-light)">
                <span class="material-icons-round nav-icon">account_balance_wallet</span> Nạp tiền
              </a>
            }
            <a routerLink="/profile" routerLinkActive="active" class="nav-link">
              <span class="material-icons-round nav-icon">person</span> Hồ sơ
            </a>
          }
        </nav>

        <!-- RIGHT: Desktop actions -->
        <div class="desktop-actions">
          @if (auth.isLoggedIn()) {
            <div class="user-menu">
              @if (auth.currentUser()?.avatarUrl) {
                <img [src]="auth.currentUser()?.avatarUrl" alt="Avatar" class="user-avatar-img" />
              } @else {
                <div class="user-avatar">{{ auth.currentUser()?.avatar }}</div>
              }
              <span class="user-name">{{ auth.currentUser()?.fullName }}</span>
              <button class="btn btn-secondary btn-sm" (click)="onLogout()">
                <span class="material-icons-round" style="font-size:16px">logout</span> Đăng xuất
              </button>
            </div>
          } @else {
            <a routerLink="/login" class="btn btn-secondary btn-sm">Đăng nhập</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Đăng ký</a>
          }
        </div>

        <!-- RIGHT: Hamburger (mobile only) -->
        <button class="hamburger" (click)="toggleMenu()" [attr.aria-label]="'Menu'" [class.hamburger-open]="menuOpen()">
          <span></span><span></span><span></span>
        </button>
      </div>

      <!-- MOBILE DROPDOWN MENU (completely separate from header bar) -->
      @if (menuOpen()) {
        <div class="mobile-backdrop" (click)="closeMenu()"></div>
      }
      <div class="mobile-menu" [class.mobile-menu-open]="menuOpen()">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="mobile-link" (click)="closeMenu()">
          <span class="material-icons-round">home</span> Trang chủ
        </a>
        <a routerLink="/jobs" routerLinkActive="active" class="mobile-link" (click)="closeMenu()">
          <span class="material-icons-round">work</span> Việc làm
        </a>

        @if (auth.isLoggedIn()) {
          @if (auth.isAdmin()) {
            <a routerLink="/admin/dashboard" routerLinkActive="active" class="mobile-link" (click)="closeMenu()">
              <span class="material-icons-round">admin_panel_settings</span> Admin Panel
            </a>
          }
          @if (auth.isEmployer()) {
            <a routerLink="/employer/dashboard" routerLinkActive="active" class="mobile-link" (click)="closeMenu()">
              <span class="material-icons-round">dashboard</span> Dashboard
            </a>
            <a routerLink="/pricing" routerLinkActive="active" class="mobile-link" (click)="closeMenu()">
              <span class="material-icons-round">account_balance_wallet</span> Nạp tiền
            </a>
          }
          <a routerLink="/profile" routerLinkActive="active" class="mobile-link" (click)="closeMenu()">
            <span class="material-icons-round">person</span> Hồ sơ
          </a>
          <div class="mobile-divider"></div>
          <button class="mobile-link mobile-logout" (click)="onLogout()">
            <span class="material-icons-round">logout</span> Đăng xuất
          </button>
        } @else {
          <div class="mobile-divider"></div>
          <a routerLink="/login" routerLinkActive="active" class="mobile-link" (click)="closeMenu()">
            <span class="material-icons-round">login</span> Đăng nhập
          </a>
          <a routerLink="/register" routerLinkActive="active" class="mobile-link mobile-register" (click)="closeMenu()">
            <span class="material-icons-round">person_add</span> Đăng ký
          </a>
        }
      </div>
    </header>
  `,
  styles: [`
    /* ==========================================
       HEADER CONTAINER
       ========================================== */
    :host {
      display: block;
    }

    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }

    /* ==========================================
       HEADER BAR (the visible top bar)
       ========================================== */
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
      padding: 0 24px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
      z-index: 1002;
    }

    /* ==========================================
       LOGO
       ========================================== */
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
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 32px;
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

    /* ==========================================
       DESKTOP NAV (hidden on mobile)
       ========================================== */
    .desktop-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      margin: 0 24px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      color: #94A3B8;
      font-size: 14px;
      font-weight: 500;
      border-radius: 10px;
      transition: all 150ms ease;
      text-decoration: none;
      white-space: nowrap;
    }

    .nav-link:hover {
      color: #F1F5F9;
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-link.active {
      color: #818CF8;
      background: rgba(79, 70, 229, 0.1);
    }

    .nav-icon { font-size: 18px; }

    /* ==========================================
       DESKTOP ACTIONS (hidden on mobile)
       ========================================== */
    .desktop-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4F46E5, #7C3AED);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .user-name {
      font-size: 14px;
      font-weight: 500;
      color: #F1F5F9;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-avatar-img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #818CF8;
      flex-shrink: 0;
    }

    /* ==========================================
       HAMBURGER (hidden on desktop)
       ========================================== */
    .hamburger {
      display: none;  /* shown via media query */
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      flex-shrink: 0;
      z-index: 1003;
    }

    .hamburger span {
      display: block;
      width: 24px;
      height: 2.5px;
      background: #F1F5F9;
      border-radius: 2px;
      transition: all 250ms ease;
      transform-origin: center;
    }

    .hamburger-open span:nth-child(1) {
      transform: rotate(45deg) translate(5px, 5px);
    }
    .hamburger-open span:nth-child(2) {
      opacity: 0;
    }
    .hamburger-open span:nth-child(3) {
      transform: rotate(-45deg) translate(5px, -5px);
    }

    /* ==========================================
       MOBILE MENU (hidden on desktop)
       ========================================== */
    .mobile-backdrop {
      display: none;
    }

    .mobile-menu {
      display: none;  /* shown via media query */
    }

    .mobile-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      color: #94A3B8;
      font-size: 16px;
      font-weight: 500;
      text-decoration: none;
      border: none;
      background: none;
      cursor: pointer;
      width: 100%;
      font-family: inherit;
      border-radius: 8px;
      transition: all 150ms ease;
    }

    .mobile-link:hover,
    .mobile-link:active {
      color: #F1F5F9;
      background: rgba(255, 255, 255, 0.05);
    }

    .mobile-link.active {
      color: #818CF8;
      background: rgba(79, 70, 229, 0.12);
    }

    .mobile-link .material-icons-round {
      font-size: 22px;
    }

    .mobile-logout {
      color: #EF4444 !important;
    }

    .mobile-logout:hover,
    .mobile-logout:active {
      background: rgba(239, 68, 68, 0.1) !important;
    }

    .mobile-register {
      color: #818CF8;
    }

    .mobile-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 8px 16px;
    }

    /* ==========================================
       RESPONSIVE: MOBILE (max-width: 768px)
       ========================================== */
    @media (max-width: 768px) {
      /* Header bar: shorter */
      .header-bar {
        height: 56px;
        padding: 0 16px;
      }

      /* Logo: smaller */
      .logo-icon {
        width: 32px;
        height: 32px;
      }

      .logo-text {
        font-size: 24px;
      }

      .logo {
        gap: 8px;
      }

      /* HIDE desktop nav & actions completely */
      .desktop-nav {
        display: none !important;
      }

      .desktop-actions {
        display: none !important;
      }

      /* SHOW hamburger */
      .hamburger {
        display: flex;
      }

      /* MOBILE MENU: slide down from header */
      .mobile-menu {
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        background: rgba(15, 23, 42, 0.98);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding: 8px;
        z-index: 1001;
        transform: translateY(-110%);
        opacity: 0;
        transition: transform 250ms ease, opacity 200ms ease;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        max-height: calc(100vh - 56px);
        max-height: calc(100dvh - 56px);
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .mobile-menu-open {
        transform: translateY(0);
        opacity: 1;
      }

      /* Backdrop to close menu on tap outside */
      .mobile-backdrop {
        display: block;
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 1000;
      }
    }

    /* ==========================================
       VERY SMALL PHONES (max-width: 380px)
       ========================================== */
    @media (max-width: 380px) {
      .header-bar {
        padding: 0 12px;
      }

      .logo-text {
        font-size: 20px;
      }

      .logo-icon {
        width: 28px;
        height: 28px;
      }

      .logo {
        gap: 6px;
      }

      .mobile-link {
        padding: 12px 16px;
        font-size: 15px;
      }
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
