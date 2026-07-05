import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { JobService } from '../../services/job.service';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-page-content">
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
                <span class="stat-number">{{ data().summary.totalUsers }}</span>
                <span class="stat-label">Tổng người dùng</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#10B981,#059669)">
                <span class="material-icons-round">work</span>
              </div>
              <div>
                <span class="stat-number">{{ data().summary.totalJobs }}</span>
                <span class="stat-label">Tổng việc làm</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#0D9488,#14B8A6)">
                <span class="material-icons-round">account_balance_wallet</span>
              </div>
              <div>
                <span class="stat-number">{{ formatCurrency(data().summary.totalDeposits || 0) }}</span>
                <span class="stat-label">Dòng tiền nạp vào</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#6366F1,#4F46E5)">
                <span class="material-icons-round">payments</span>
              </div>
              <div>
                <span class="stat-number">{{ formatCurrency(data().summary.totalRevenue || 0) }}</span>
                <span class="stat-label">Doanh thu thực tế</span>
              </div>
            </div>

          </div>

          <!-- Revenue Details Row -->
          <div class="dashboard-row animate-fade-in-up" style="animation-delay:0.15s">
            <!-- Revenue Chart -->
            <div class="chart-section glass-card" style="margin-bottom: 0;">
              <h3><span class="material-icons-round">trending_up</span> Doanh thu 6 tháng gần nhất</h3>
              <div class="chart-container">
                @for (item of data().revenueByMonth; track item.month) {
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

            <!-- Revenue Breakdown -->
            <div class="breakdown-section glass-card">
              <h3><span class="material-icons-round">pie_chart</span> Cấu trúc doanh thu thực tế</h3>
              <div class="breakdown-container">
                <div class="breakdown-item">
                  <div class="breakdown-info">
                    <span class="breakdown-name">Phí hoa hồng (10%)</span>
                    <span class="breakdown-val">{{ formatCurrency(data().summary.commissionRevenue || 0) }} ({{ getPercentage(data().summary.commissionRevenue || 0) }}%)</span>
                  </div>
                  <div class="breakdown-progress-bg">
                    <div class="breakdown-progress-fill" [style.width.%]="getPercentage(data().summary.commissionRevenue || 0)" style="background: linear-gradient(90deg, #10B981, #059669)"></div>
                  </div>
                </div>

                <div class="breakdown-item">
                  <div class="breakdown-info">
                    <span class="breakdown-name">Phí đăng tin (2.000đ)</span>
                    <span class="breakdown-val">{{ formatCurrency(data().summary.postingFeeRevenue || 0) }} ({{ getPercentage(data().summary.postingFeeRevenue || 0) }}%)</span>
                  </div>
                  <div class="breakdown-progress-bg">
                    <div class="breakdown-progress-fill" [style.width.%]="getPercentage(data().summary.postingFeeRevenue || 0)" style="background: linear-gradient(90deg, #F59E0B, #F97316)"></div>
                  </div>
                </div>

                <div class="breakdown-item">
                  <div class="breakdown-info">
                    <span class="breakdown-name">Gói dịch vụ</span>
                    <span class="breakdown-val">{{ formatCurrency(data().summary.subscriptionRevenue || 0) }} ({{ getPercentage(data().summary.subscriptionRevenue || 0) }}%)</span>
                  </div>
                  <div class="breakdown-progress-bg">
                    <div class="breakdown-progress-fill" [style.width.%]="getPercentage(data().summary.subscriptionRevenue || 0)" style="background: linear-gradient(90deg, #6366F1, #4F46E5)"></div>
                  </div>
                </div>

                <div class="breakdown-total">
                  <span>Tổng doanh thu thực tế:</span>
                  <strong>{{ formatCurrency(data().summary.totalRevenue || 0) }}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Extra Stats Row -->
          <div class="extra-stats animate-fade-in-up" style="animation-delay:0.18s">
            <div class="mini-stat glass-card">
              <span class="material-icons-round" style="color:#4F46E5">school</span>
              <div>
                <strong>{{ data().summary.totalStudents }}</strong>
                <span>Sinh viên</span>
              </div>
            </div>
            <div class="mini-stat glass-card">
              <span class="material-icons-round" style="color:#10B981">business</span>
              <div>
                <strong>{{ data().summary.totalEmployers }}</strong>
                <span>Nhà tuyển dụng</span>
              </div>
            </div>
            <div class="mini-stat glass-card">
              <span class="material-icons-round" style="color:#F59E0B">verified</span>
              <div>
                <strong>{{ data().summary.ekycVerified }}</strong>
                <span>Đã xác thực</span>
              </div>
            </div>
            <div class="mini-stat glass-card">
              <span class="material-icons-round" style="color:#3B82F6">send</span>
              <div>
                <strong>{{ data().summary.applicationsThisMonth }}</strong>
                <span>Ứng tuyển tháng này</span>
              </div>
            </div>
          </div>

          <!-- Packages Table -->
          <div class="packages-section glass-card animate-fade-in-up" style="animation-delay:0.2s">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6);">
              <h3 style="margin-bottom: 0;"><span class="material-icons-round">inventory_2</span> Gói dịch vụ</h3>
              <button class="btn btn-primary btn-sm" (click)="openCreatePackageModal()">
                <span class="material-icons-round" style="font-size:16px;">add</span> Thêm gói mới
              </button>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Gói</th>
                    <th>Thời hạn</th>
                    <th>Giá</th>
                    <th>Mô tả</th>
                    <th>Số lượng KH</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  @for (pkg of data().packages; track pkg.id) {
                    <tr>
                      <td><strong>{{ pkg.name }}</strong></td>
                      <td>{{ pkg.duration }}</td>
                      <td class="price">{{ formatPrice(pkg.price) }}</td>
                      <td class="desc-col">{{ pkg.description }}</td>
                      <td>
                        <span class="badge badge-primary">{{ pkg.subscribers }}</span>
                      </td>
                      <td>
                        <button class="btn btn-secondary btn-sm" (click)="openEditPackageModal(pkg)">
                          <span class="material-icons-round" style="font-size: 16px;">edit</span> Sửa
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Package Edit Modal -->
          @if (editingPackage()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card">
                <div class="modal-header">
                  <h3>{{ editingPackage()?.id ? 'Chỉnh sửa gói dịch vụ' : 'Thêm gói dịch vụ mới' }}</h3>
                  <button class="close-btn" (click)="closePackageModal()">
                    <span class="material-icons-round">close</span>
                  </button>
                </div>
                
                <form (submit)="savePackage($event)" class="package-form">
                  <div class="form-group" style="margin-bottom: var(--space-4);">
                    <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--font-size-sm); color: var(--text-secondary);">Tên gói dịch vụ</label>
                    <input type="text" name="name" [(ngModel)]="packageForm.name" required class="form-input" placeholder="Ví dụ: Gói 3 tháng" style="width: 100%;" />
                  </div>

                  <div class="form-group-row" style="display: flex; gap: var(--space-4); margin-bottom: var(--space-4);">
                    <div class="form-group" style="flex: 1;">
                      <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--font-size-sm); color: var(--text-secondary);">Giá (VND)</label>
                      <input type="number" name="price" [(ngModel)]="packageForm.price" required class="form-input" placeholder="Ví dụ: 300000" style="width: 100%;" />
                    </div>
                    <div class="form-group" style="flex: 1;">
                      <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--font-size-sm); color: var(--text-secondary);">Thời hạn (tháng)</label>
                      <input type="number" name="durationMonths" [(ngModel)]="packageForm.durationMonths" required class="form-input" placeholder="Ví dụ: 3" style="width: 100%;" />
                    </div>
                  </div>

                  <div class="form-group" style="margin-bottom: var(--space-4);">
                    <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--font-size-sm); color: var(--text-secondary);">Mô tả gói</label>
                    <textarea name="description" [(ngModel)]="packageForm.description" class="form-input" rows="3" placeholder="Nhập mô tả các đặc quyền của gói..." style="width: 100%; font-family: inherit;"></textarea>
                  </div>

                  @if (editingPackage()?.id) {
                    <div class="form-group-checkbox" style="margin-bottom: var(--space-6); display: flex; align-items: center; gap: var(--space-2);">
                      <label class="checkbox-label" style="display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); cursor: pointer; color: var(--text-secondary);">
                        <input type="checkbox" name="isActive" [(ngModel)]="packageForm.isActive" style="width: 16px; height: 16px;" /> Hoạt động (hiển thị cho khách hàng)
                      </label>
                    </div>
                  }

                  <div class="modal-actions" style="margin-top: var(--space-6); display: flex; gap: var(--space-4); justify-content: flex-end;">
                    @if (editingPackage()?.id) {
                      <button type="button" class="btn btn-danger" (click)="deletePackage()" style="margin-right: auto;">
                        <span class="material-icons-round" style="font-size:16px;">delete</span> Vô hiệu hóa
                      </button>
                    }
                    <button type="button" class="btn btn-secondary" (click)="closePackageModal()">Hủy</button>
                    <button type="submit" class="btn btn-primary">Lưu lại</button>
                  </div>
                </form>
              </div>
            </div>
          }
          @if (showConfirmDeletePackageModal()) {
            <div class="modal-overlay animate-fade-in" style="z-index:1100">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 480px; text-align: center;">
                <span class="material-icons-round text-warning" style="font-size:64px; margin-bottom:16px; color:#F59E0B">warning</span>
                <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Xác nhận vô hiệu hóa</h3>
                <p style="color:var(--text-secondary); margin-bottom:24px; font-size: 0.95rem;">
                  Bạn có chắc chắn muốn vô hiệu hóa gói dịch vụ này? Gói sẽ không hiển thị cho người mua nữa.
                </p>
                <div style="display:flex; gap:12px; justify-content:center">
                  <button type="button" class="btn btn-secondary" style="flex:1" (click)="showConfirmDeletePackageModal.set(false)">Hủy</button>
                  <button type="button" class="btn btn-danger" style="flex:1; background:#EF4444" (click)="executeDeletePackage()">
                    Xác nhận vô hiệu hóa
                  </button>
                </div>
              </div>
            </div>
          }
    </div>
  `,
  styles: [`
    .admin-page-content {
      width: 100%;
    }

    .dashboard-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

    .dashboard-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--space-5);
      margin-bottom: var(--space-8);
    }

    .breakdown-section h3 {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-lg);
      font-weight: 700;
      margin-bottom: var(--space-6);
    }

    .breakdown-section h3 .material-icons-round {
      color: var(--primary-light);
    }

    .breakdown-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .breakdown-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .breakdown-info {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-sm);
      font-weight: 600;
    }

    .breakdown-name {
      color: var(--text-secondary);
    }

    .breakdown-val {
      color: var(--text-primary);
    }

    

    

    

    

    

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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

    .dashboard-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--space-5);
      margin-bottom: var(--space-8);
    }

    .breakdown-section h3 {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-lg);
      font-weight: 700;
      margin-bottom: var(--space-6);
    }

    .breakdown-section h3 .material-icons-round {
      color: var(--primary-light);
    }

    .breakdown-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .breakdown-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .breakdown-info {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-sm);
      font-weight: 600;
    }

    .breakdown-name {
      color: var(--text-secondary);
    }

    .breakdown-val {
      color: var(--text-primary);
    }

    .breakdown-progress-bg {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-full);
      overflow: hidden;
      border: 1px solid var(--border-light);
    }

    .breakdown-progress-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.6s ease;
    }

    .breakdown-total {
      margin-top: var(--space-2);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--font-size-sm);
    }

    .breakdown-total span {
      color: var(--text-muted);
      font-weight: 500;
    }

    .breakdown-total strong {
      font-size: var(--font-size-lg);
      color: var(--primary-light);
      font-weight: 800;
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

    /* Modal Overlay & Content */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: var(--space-4);
    }

    .modal-content {
      width: 100%; max-width: 550px; max-height: 90vh; overflow-y: auto;
      padding: var(--space-8);
      background: var(--bg-glass);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-xl);
    }

    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: var(--space-6);
    }

    .modal-header h3 { font-size: var(--font-size-xl); font-weight: 700; }

    .close-btn {
      background: none; border: none; color: var(--text-muted); cursor: pointer;
      padding: var(--space-1);
    }
    .close-btn:hover { color: var(--text-primary); }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .form-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      transition: all var(--transition-fast);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary-light);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
    }

    .badge {
      display: inline-block;
      padding: var(--space-1) var(--space-2);
      font-size: var(--font-size-xs);
      font-weight: 600;
      border-radius: var(--radius-full);
    }

    .badge-primary {
      background: rgba(79, 70, 229, 0.1);
      color: var(--primary-light);
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
export class AdminDashboardComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  data = signal<any>({
    summary: { 
      totalUsers: 0, 
      totalJobs: 0, 
      totalRevenue: 0, 
      totalDeposits: 0, 
      commissionRevenue: 0, 
      postingFeeRevenue: 0, 
      subscriptionRevenue: 0, 
      ekycPending: 0, 
      totalStudents: 0, 
      totalEmployers: 0, 
      ekycVerified: 0, 
      applicationsThisMonth: 0 
    },
    revenueByMonth: [],
    packages: []
  });

  maxRevenue = signal(1);
  editingPackage = signal<any | null>(null);
  packageForm = {
    id: 0,
    name: '',
    price: 0,
    durationMonths: 1,
    description: '',
    isActive: true
  };

  showConfirmDeletePackageModal = signal(false);

  private hubConnection?: HubConnection;

  ngOnInit() {
    this.loadStats();
    this.connectSignalR();
  }

  ngOnDestroy() {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR connection stopped.'))
        .catch((err) => console.error('Error stopping SignalR:', err));
    }
  }

  loadStats() {
    this.http.get<any>(`${API_BASE_URL}/admin/dashboard`).subscribe({
      next: (res) => {
        this.data.set(res);
        const revenues = (res.revenueByMonth || []).map((r: any) => r.revenue);
        this.maxRevenue.set(Math.max(...revenues, 1));
      },
      error: (err) => console.error('Failed to load admin dashboard:', err)
    });
  }

  private connectSignalR() {
    const hubUrl = API_BASE_URL.endsWith('/api')
      ? API_BASE_URL.substring(0, API_BASE_URL.length - 4) + '/hub/dashboard'
      : '/hub/dashboard';

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('TransactionOccurred', () => {
      console.log('[SignalR] TransactionOccurred event received, reloading stats.');
      this.loadStats();
    });

    this.hubConnection.on('JobCreated', () => {
      console.log('[SignalR] JobCreated event received, reloading stats.');
      this.loadStats();
    });

    this.hubConnection.on('UserRegistered', () => {
      console.log('[SignalR] UserRegistered event received, reloading stats.');
      this.loadStats();
    });

    this.hubConnection.start()
      .then(() => console.log('SignalR connection established successfully.'))
      .catch((err) => console.error('Error starting SignalR connection:', err));
  }

  openCreatePackageModal() {
    this.packageForm = {
      id: 0,
      name: '',
      price: 0,
      durationMonths: 1,
      description: '',
      isActive: true
    };
    this.editingPackage.set({ id: 0 });
  }

  openEditPackageModal(pkg: any) {
    this.packageForm = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      durationMonths: pkg.durationMonths || 1,
      description: pkg.description || '',
      isActive: true
    };
    this.editingPackage.set(pkg);
  }

  closePackageModal() {
    this.editingPackage.set(null);
  }

  savePackage(event: Event) {
    event.preventDefault();
    const payload = {
      name: this.packageForm.name,
      price: this.packageForm.price,
      durationMonths: this.packageForm.durationMonths,
      description: this.packageForm.description,
      isActive: this.packageForm.isActive
    };

    if (this.packageForm.id === 0) {
      this.http.post<any>(`${API_BASE_URL}/admin/packages`, payload).subscribe({
        next: () => {
          this.toast.success('Thêm gói dịch vụ mới thành công!');
          this.closePackageModal();
          this.loadStats();
        },
        error: (err) => {
          const msg = err.error?.message || 'Không thể tạo gói dịch vụ mới.';
          this.toast.error(msg);
        }
      });
    } else {
      this.http.put<any>(`${API_BASE_URL}/admin/packages/${this.packageForm.id}`, payload).subscribe({
        next: () => {
          this.toast.success('Cập nhật gói dịch vụ thành công!');
          this.closePackageModal();
          this.loadStats();
        },
        error: (err) => {
          const msg = err.error?.message || 'Không thể cập nhật gói dịch vụ.';
          this.toast.error(msg);
        }
      });
    }
  }

  deletePackage() {
    this.showConfirmDeletePackageModal.set(true);
  }

  executeDeletePackage() {
    this.showConfirmDeletePackageModal.set(false);
    this.http.delete<any>(`${API_BASE_URL}/admin/packages/${this.packageForm.id}`).subscribe({
      next: () => {
        this.toast.success('Vô hiệu hóa gói dịch vụ thành công!');
        this.closePackageModal();
        this.loadStats();
      },
      error: (err) => {
        const msg = err.error?.message || 'Không thể vô hiệu hóa gói dịch vụ.';
        this.toast.error(msg);
      }
    });
  }

  getBarHeight(revenue: number): number {
    return (revenue / this.maxRevenue()) * 85;
  }

  getPercentage(amount: number): number {
    const total = this.data().summary.totalRevenue || 0;
    if (total === 0) return 0;
    return Math.round((amount / total) * 100);
  }

  formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'tr';
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
