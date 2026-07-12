import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AdminSearchService } from '../../services/admin-search.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <section class="admin-layout-wrapper">
      @if (!auth.isAdmin()) {
        <div class="container" style="padding-top: 120px;">
          <div class="auth-required glass-card animate-fade-in-up" style="text-align: center; max-width: 500px; margin: 0 auto; padding: 2rem;">
            <span class="material-icons-round" style="font-size:64px;color:#EF4444">admin_panel_settings</span>
            <h2>Truy cập bị từ chối</h2>
            <p>Chỉ tài khoản Admin mới có quyền truy cập khu vực này.</p>
            <a routerLink="/login" class="btn btn-primary btn-lg">Đăng nhập Admin</a>
          </div>
        </div>
      } @else {
        <div class="admin-container">
          <!-- Sidebar -->
          <aside class="admin-sidebar glass-card animate-fade-in-left">
            <div class="sidebar-header">
              <h2>Admin Panel</h2>
            </div>
            <nav class="sidebar-nav">
              <a routerLink="/admin/dashboard" class="sidebar-link" routerLinkActive="active">
                <span class="material-icons-round">dashboard</span> Dashboard
              </a>
              <a routerLink="/admin/users" class="sidebar-link" routerLinkActive="active">
                <span class="material-icons-round">people</span> Quản lý User
              </a>
              <a routerLink="/admin/withdrawals" class="sidebar-link" routerLinkActive="active">
                <span class="material-icons-round">account_balance_wallet</span> Duyệt rút tiền
              </a>
              <a routerLink="/admin/disputes" class="sidebar-link" routerLinkActive="active">
                <span class="material-icons-round">gavel</span> Giải quyết tranh chấp
              </a>
              <a routerLink="/admin/revenue" class="sidebar-link" routerLinkActive="active">
                <span class="material-icons-round">receipt_long</span> Doanh thu & Dòng tiền
              </a>
              <a routerLink="/admin/payos-logs" class="sidebar-link" routerLinkActive="active">
                <span class="material-icons-round">account_balance</span> Logs Nạp Tiền (PayOS)
              </a>
              <a routerLink="/admin/ledger" class="sidebar-link" routerLinkActive="active">
                <span class="material-icons-round">receipt_long</span> Sổ Cái (Ledger)
              </a>
              <a routerLink="/admin/escrow-logs" class="sidebar-link" routerLinkActive="active">
                <span class="material-icons-round">gavel</span> Log Ký Quỹ (Escrow)
              </a>
            </nav>
            <div class="sidebar-footer">
              <div class="admin-profile">
                <div class="avatar">A</div>
                <div class="info">
                  <div class="name">Administrator</div>
                  <div class="email">admin@unitask.vn</div>
                </div>
              </div>
            </div>
          </aside>

          <!-- Main Content -->
          <main class="admin-main-content">
            <header class="admin-top-bar glass-card">
              <div class="breadcrumbs">
                UniTask <span class="separator">/</span> <span class="current">Admin Panel</span>
              </div>
              <div class="search-bar">
                <span class="material-icons-round">search</span>
                <input type="text" placeholder="Tìm kiếm nhanh..." [ngModel]="searchService.searchQuery()" (ngModelChange)="searchService.searchQuery.set($event)">
              </div>
            </header>
            <div class="page-content">
              <router-outlet></router-outlet>
            </div>
          </main>
        </div>
      }
    </section>
  `,
  styles: [`
    .admin-layout-wrapper {
      padding-top: 80px; /* Adjust based on global header height */
      min-height: 100vh;
      background: var(--bg-main);
    }
    
    .admin-container {
      display: flex;
      max-width: 1400px;
      margin: 0 auto;
      padding: var(--space-6);
      gap: var(--space-6);
      align-items: flex-start;
    }

    .admin-sidebar {
      flex: 0 0 280px;
      position: sticky;
      top: calc(80px + var(--space-6));
      padding: var(--space-4);
      border-radius: var(--radius-xl);
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      box-shadow: 0 8px 32px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      height: calc(100vh - 80px - var(--space-12));
    }

    .sidebar-header {
      padding: var(--space-2) var(--space-2) var(--space-4);
      margin-bottom: var(--space-4);
      border-bottom: 1px solid var(--border-color);
    }
    
    .sidebar-header h2 {
      font-size: var(--font-size-xl);
      font-weight: 800;
      margin: 0;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      overflow-y: auto;
    }
    
    /* Scrollbar for nav */
    .sidebar-nav::-webkit-scrollbar { width: 4px; }
    .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

    .sidebar-link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-lg);
      color: var(--text-secondary);
      text-decoration: none;
      font-weight: 600;
      font-size: var(--font-size-sm);
      transition: all var(--transition-fast);
      position: relative;
      overflow: hidden;
    }

    .sidebar-link::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0; width: 3px;
      background: var(--primary-light);
      transform: scaleY(0);
      transition: transform var(--transition-fast);
      transform-origin: left;
    }

    .sidebar-link:hover {
      background: rgba(255,255,255, 0.05);
      color: var(--text-primary);
    }

    .sidebar-link.active {
      background: var(--primary-gradient);
      color: white;
      box-shadow: var(--shadow-glow);
    }

    .sidebar-link.active::before {
      transform: scaleY(1);
    }

    .sidebar-link .material-icons-round {
      font-size: 20px;
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: var(--space-4);
      border-top: 1px solid var(--border-color);
    }

    .admin-profile {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .admin-profile .avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: var(--primary-gradient);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800;
    }

    .admin-profile .info .name {
      font-weight: 700; font-size: var(--font-size-sm); color: var(--text-primary);
    }

    .admin-profile .info .email {
      font-size: var(--font-size-xs); color: var(--text-muted);
    }

    .admin-main-content {
      flex: 1;
      min-width: 0; /* Prevent overflow */
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .admin-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3) var(--space-6);
      border-radius: var(--radius-xl);
      animation: fade-in-up 0.4s ease-out;
    }

    .breadcrumbs {
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }

    .breadcrumbs .separator { margin: 0 var(--space-2); opacity: 0.5; }
    .breadcrumbs .current { color: var(--primary-light); }

    .search-bar {
      position: relative;
    }

    .search-bar .material-icons-round {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 20px;
    }

    .search-bar input {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border-light);
      padding: 8px 16px 8px 40px;
      border-radius: var(--radius-full);
      color: white;
      width: 280px;
      outline: none;
      transition: all var(--transition-fast);
      font-size: var(--font-size-sm);
    }

    .search-bar input:focus {
      background: rgba(255,255,255,0.1);
      border-color: var(--primary-light);
      width: 320px;
    }

    /* Mobile responsiveness */
    @media (max-width: 992px) {
      .admin-container {
        flex-direction: column;
        padding: var(--space-4);
      }
      .admin-sidebar {
        flex: none;
        width: 100%;
        position: static;
      }
      .admin-main-content {
        width: 100%;
      }
    }
  `]
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  searchService = inject(AdminSearchService);
}
