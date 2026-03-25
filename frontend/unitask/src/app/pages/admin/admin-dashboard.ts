import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { JobService } from '../../services/job.service';
import ADMIN_DATA from '../../../assets/data/mock-admin.json';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="admin-page">
      <div class="container">
        @if (!auth.isAdmin()) {
          <div class="auth-required glass-card animate-fade-in-up">
            <span class="material-icons-round" style="font-size:64px;color:#EF4444">admin_panel_settings</span>
            <h2>Truy cập bị từ chối</h2>
            <p>Chỉ tài khoản Admin mới có quyền truy cập khu vực này.</p>
            <a routerLink="/login" class="btn btn-primary btn-lg">Đăng nhập Admin</a>
          </div>
        } @else {
          <!-- Admin Nav -->
          <div class="admin-nav animate-fade-in-up">
            <a routerLink="/admin/dashboard" class="admin-tab active">
              <span class="material-icons-round">dashboard</span> Dashboard
            </a>
            <a routerLink="/admin/users" class="admin-tab">
              <span class="material-icons-round">people</span> Quản lý User
            </a>
          </div>

          <div class="dashboard-header animate-fade-in-up">
            <h1>Admin <span class="gradient-text">Dashboard</span></h1>
            <p>Tổng quan hệ thống UniTask</p>
          </div>

          <!-- Stat Cards -->
          <div class="stats-grid animate-fade-in-up" style="animation-delay:0.1s">
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#4F46E5,#7C3AED)">
                <span class="material-icons-round">people</span>
              </div>
              <div>
                <span class="stat-number">{{ data.summary.totalUsers }}</span>
                <span class="stat-label">Tổng người dùng</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#10B981,#059669)">
                <span class="material-icons-round">work</span>
              </div>
              <div>
                <span class="stat-number">{{ data.summary.totalJobs }}</span>
                <span class="stat-label">Tổng việc làm</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#F59E0B,#F97316)">
                <span class="material-icons-round">payments</span>
              </div>
              <div>
                <span class="stat-number">{{ formatCurrency(data.summary.totalRevenue) }}</span>
                <span class="stat-label">Tổng doanh thu</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#EF4444,#DC2626)">
                <span class="material-icons-round">pending_actions</span>
              </div>
              <div>
                <span class="stat-number">{{ data.summary.ekycPending }}</span>
                <span class="stat-label">eKYC chờ duyệt</span>
              </div>
            </div>
          </div>

          <!-- Revenue Chart -->
          <div class="chart-section glass-card animate-fade-in-up" style="animation-delay:0.15s">
            <h3><span class="material-icons-round">trending_up</span> Doanh thu 6 tháng gần nhất</h3>
            <div class="chart-container">
              @for (item of data.revenueByMonth; track item.month) {
                <div class="chart-bar-wrapper">
                  <div class="chart-value">{{ formatShortCurrency(item.revenue) }}</div>
                  <div class="chart-bar" [style.height.%]="getBarHeight(item.revenue)">
                    <div class="chart-bar-fill"></div>
                  </div>
                  <div class="chart-label">{{ item.month }}</div>
                </div>
              }
            </div>
          </div>

          <!-- Extra Stats Row -->
          <div class="extra-stats animate-fade-in-up" style="animation-delay:0.18s">
            <div class="mini-stat glass-card">
              <span class="material-icons-round" style="color:#4F46E5">school</span>
              <div>
                <strong>{{ data.summary.totalStudents }}</strong>
                <span>Sinh viên</span>
              </div>
            </div>
            <div class="mini-stat glass-card">
              <span class="material-icons-round" style="color:#10B981">business</span>
              <div>
                <strong>{{ data.summary.totalEmployers }}</strong>
                <span>Nhà tuyển dụng</span>
              </div>
            </div>
            <div class="mini-stat glass-card">
              <span class="material-icons-round" style="color:#F59E0B">verified</span>
              <div>
                <strong>{{ data.summary.ekycVerified }}</strong>
                <span>Đã xác thực</span>
              </div>
            </div>
            <div class="mini-stat glass-card">
              <span class="material-icons-round" style="color:#3B82F6">send</span>
              <div>
                <strong>{{ data.summary.applicationsThisMonth }}</strong>
                <span>Ứng tuyển tháng này</span>
              </div>
            </div>
          </div>

          <!-- Packages Table -->
          <div class="packages-section glass-card animate-fade-in-up" style="animation-delay:0.2s">
            <h3><span class="material-icons-round">inventory_2</span> Gói dịch vụ</h3>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Gói</th>
                    <th>Thời hạn</th>
                    <th>Giá</th>
                    <th>Mô tả</th>
                    <th>Số lượng KH</th>
                  </tr>
                </thead>
                <tbody>
                  @for (pkg of data.packages; track pkg.id) {
                    <tr>
                      <td><strong>{{ pkg.name }}</strong></td>
                      <td>{{ pkg.duration }}</td>
                      <td class="price">{{ formatPrice(pkg.price) }}</td>
                      <td class="desc-col">{{ pkg.description }}</td>
                      <td>
                        <span class="badge badge-primary">{{ pkg.subscribers }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .admin-page {
      padding: calc(80px + var(--space-8)) 0 var(--space-16);
    }

    .auth-required {
      text-align: center;
      padding: var(--space-16);
      max-width: 500px;
      margin: var(--space-10) auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
    }

    .auth-required p { color: var(--text-secondary); }

    .admin-nav {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-8);
      background: var(--bg-glass);
      padding: var(--space-2);
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-light);
      width: fit-content;
    }

    .admin-tab {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      border-radius: var(--radius-lg);
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-secondary);
      text-decoration: none;
      transition: all var(--transition-fast);
    }

    .admin-tab:hover {
      color: var(--text-primary);
      background: rgba(79, 70, 229, 0.08);
    }

    .admin-tab.active {
      background: var(--primary);
      color: white;
    }

    .admin-tab .material-icons-round { font-size: 18px; }

    .dashboard-header {
      margin-bottom: var(--space-8);
    }

    .dashboard-header h1 {
      font-size: var(--font-size-3xl);
      font-weight: 800;
      margin-bottom: var(--space-2);
    }

    .gradient-text {
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .dashboard-header p { color: var(--text-secondary); }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-5);
      margin-bottom: var(--space-8);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-5);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon .material-icons-round { color: white; font-size: 24px; }

    .stat-number {
      display: block;
      font-size: var(--font-size-xl);
      font-weight: 800;
    }

    .stat-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    /* Chart */
    .chart-section, .packages-section {
      margin-bottom: var(--space-8);
    }

    .chart-section h3, .packages-section h3 {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-lg);
      font-weight: 700;
      margin-bottom: var(--space-6);
    }

    .chart-section h3 .material-icons-round,
    .packages-section h3 .material-icons-round {
      color: var(--primary-light);
    }

    .chart-container {
      display: flex;
      align-items: flex-end;
      gap: var(--space-4);
      height: 220px;
      padding: var(--space-4) 0;
    }

    .chart-bar-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      height: 100%;
      justify-content: flex-end;
    }

    .chart-value {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--primary-light);
    }

    .chart-bar {
      width: 100%;
      max-width: 60px;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      overflow: hidden;
      transition: height 0.6s ease;
    }

    .chart-bar-fill {
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #7C3AED, #4F46E5);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }

    .chart-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      font-weight: 500;
    }

    /* Extra Stats */
    .extra-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4);
      margin-bottom: var(--space-8);
    }

    .mini-stat {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
    }

    .mini-stat .material-icons-round { font-size: 28px; }

    .mini-stat strong {
      display: block;
      font-size: var(--font-size-lg);
      font-weight: 800;
    }

    .mini-stat span {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    /* Table */
    .table-wrapper { overflow-x: auto; }

    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .data-table th {
      text-align: left;
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-light);
    }

    .data-table td {
      padding: var(--space-4);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-light);
    }

    .data-table tr:last-child td { border-bottom: none; }

    .data-table .price {
      color: var(--success);
      font-weight: 700;
    }

    .data-table .desc-col {
      max-width: 300px;
      font-size: var(--font-size-xs);
    }

    @media (max-width: 768px) {
      .stats-grid, .extra-stats { grid-template-columns: 1fr 1fr; }
      .chart-container { height: 160px; }
    }

    @media (max-width: 480px) {
      .stats-grid, .extra-stats { grid-template-columns: 1fr; }
      .admin-nav { flex-direction: column; width: 100%; }
    }
  `]
})
export class AdminDashboardComponent {
  auth = inject(AuthService);
  data = ADMIN_DATA;

  maxRevenue = Math.max(...ADMIN_DATA.revenueByMonth.map(r => r.revenue));

  getBarHeight(revenue: number): number {
    return (revenue / this.maxRevenue) * 85;
  }

  formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    }
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  formatShortCurrency(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'tr';
    }
    return (amount / 1000).toFixed(0) + 'k';
  }

  formatPrice(price: number): string {
    if (price >= 1000) {
      return price.toLocaleString('vi-VN') + 'đ';
    }
    return price + 'đ/tin';
  }
}
