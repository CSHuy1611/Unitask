import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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
            </nav>
          </aside>

          <!-- Main Content -->
          <main class="admin-main-content">
            <router-outlet></router-outlet>
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
    }

    .sidebar-header {
      padding: var(--space-4);
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
    }

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
    }

    .sidebar-link:hover {
      background: rgba(var(--primary-rgb), 0.05);
      color: var(--text-primary);
    }

    .sidebar-link.active {
      background: var(--primary);
      color: white;
      box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
    }

    .sidebar-link .material-icons-round {
      font-size: 20px;
    }

    .admin-main-content {
      flex: 1;
      min-width: 0; /* Prevent overflow */
    }

    /* Mobile responsiveness */
    @media (max-width: 992px) {
      .admin-container {
        flex-direction: column;
      }
      .admin-sidebar {
        flex: none;
        width: 100%;
        position: static;
      }
    }
  `]
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
}
