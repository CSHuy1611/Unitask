import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';

@Component({
  selector: 'app-admin-escrow-logs',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="admin-page-content">
          <div class="dashboard-header animate-fade-in-up">
            <h1>Log Tiền Ký Quỹ <span class="gradient-text">(Escrow)</span></h1>
            <p>Chi tiết số tiền hệ thống đang tạm giữ của từng công việc</p>
          </div>

          <!-- Summary Card -->
          <div class="stats-grid animate-fade-in-up" style="margin-bottom: var(--space-6);">
            <div class="stat-card glass-card" style="border-top: 3px solid var(--primary);">
              <div class="stat-icon" style="background:linear-gradient(135deg,#F59E0B,#D97706)">
                <span class="material-icons-round">gavel</span>
              </div>
              <div>
                <span class="stat-number">{{ formatCurrency(totalEscrowAmount() || 0) }}</span>
                <span class="stat-label">Tổng Tiền Ký Quỹ Đang Giữ</span>
              </div>
            </div>
          </div>

          <!-- Escrow Logs Table -->
          <div class="transactions-section glass-card animate-fade-in-up" style="animation-delay:0.1s">
            <h3 style="margin-bottom: var(--space-6); display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: var(--space-2);">
                <span class="material-icons-round" style="color:var(--primary-light)">list_alt</span> Danh sách Công việc & Escrow
              </div>
              <span class="badge" style="background: rgba(var(--primary-rgb), 0.1); color: var(--primary);">
                Tổng cộng: {{ totalCount() | number }} công việc
              </span>
            </h3>
            
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 30%">Công việc</th>
                    <th style="width: 25%">Người đăng</th>
                    <th style="width: 30%">Sinh viên thực hiện</th>
                    <th style="width: 15%">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  @if (isLoading()) {
                    <tr>
                      <td colspan="4">
                        <div class="skeleton skeleton-card" style="height: 60px;"></div>
                        <div class="skeleton skeleton-card" style="height: 60px; margin-top: 8px;"></div>
                        <div class="skeleton skeleton-card" style="height: 60px; margin-top: 8px;"></div>
                      </td>
                    </tr>
                  } @else if (escrowLogs().length === 0) {
                    <tr>
                      <td colspan="4" class="text-center" style="padding: 3rem;">
                        <div class="empty-state">
                          <span class="material-icons-round" style="font-size: 3rem; color: var(--text-muted); opacity: 0.5;">gavel</span>
                          <p style="margin-top: 1rem; color: var(--text-muted)">Không có dữ liệu ký quỹ</p>
                        </div>
                      </td>
                    </tr>
                  } @else {
                    @for (item of escrowLogs(); track item.jobId) {
                      <tr class="animate-fade-in-up" [style.animation-delay]="$index * 0.05 + 's'">
                        <td>
                          <div class="font-medium" style="line-height: 1.4;">{{ item.title }}</div>
                          <div class="text-sm font-bold text-primary" style="margin-top: 4px;">{{ formatCurrency(item.budget) }}</div>
                        </td>
                        <td>
                          <div class="font-medium">{{ item.employerName }}</div>
                          <div class="text-sm text-muted">{{ item.employerType }}</div>
                        </td>
                        <td>
                          @if(item.assignedStudent === 'Đang trong quá trình ứng tuyển') {
                            <span class="badge" style="background: rgba(245, 158, 11, 0.1); color: #D97706; border: 1px solid currentColor;">
                              <span class="material-icons-round" style="font-size: 12px; margin-right: 4px;">hourglass_empty</span>
                              Đang ứng tuyển
                            </span>
                          } @else {
                            <div class="font-medium" style="display:flex; align-items:center; gap: 4px;">
                              <span class="material-icons-round" style="font-size: 16px; color: var(--success)">check_circle</span>
                              {{ item.assignedStudent }}
                            </div>
                          }
                        </td>
                        <td>
                          <span class="badge" [style]="getStatusStyle(item.status)">
                            {{ getStatusName(item.status) }}
                          </span>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="pagination">
              <button class="btn btn-icon" [disabled]="currentPage() === 1" (click)="loadLogs(currentPage() - 1)">
                <span class="material-icons-round">chevron_left</span>
              </button>
              <span class="page-info">Trang {{ currentPage() }} / {{ Math.max(1, totalPages()) }}</span>
              <button class="btn btn-icon" [disabled]="currentPage() >= totalPages()" (click)="loadLogs(currentPage() + 1)">
                <span class="material-icons-round">chevron_right</span>
              </button>
            </div>
          </div>
    </div>
  `,
  styles: [`
    .admin-page-content { width: 100%; }
    .dashboard-header { margin-bottom: var(--space-8); text-align: center; }
    .dashboard-header h1 { font-size: 2.5rem; margin-bottom: var(--space-2); }
    .dashboard-header p { color: var(--text-muted); font-size: 1.1rem; }
    .gradient-text { background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--space-4);
    }
    
    .glass-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      box-shadow: 0 8px 32px rgba(0,0,0,0.05);
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .stat-number {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }
    .stat-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .table-wrapper { overflow-x: auto; }
    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-top: 1rem;
    }
    .data-table th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
    }
    .data-table td {
      padding: 1rem;
      vertical-align: middle;
      border-bottom: 1px solid var(--border-light);
    }
    .data-table tr:hover td {
      background: rgba(var(--primary-rgb), 0.02);
    }
    .font-medium { font-weight: 500; color: var(--text-primary); }
    .text-sm { font-size: 0.875rem; }
    .text-xs { font-size: 0.75rem; }
    .text-muted { color: var(--text-muted); }
    .text-primary { color: var(--primary-light); }
    
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }
    .btn-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-icon:hover:not(:disabled) {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    .btn-icon:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .page-info {
      font-weight: 500;
      color: var(--text-muted);
    }
    
    .skeleton {
      background: linear-gradient(90deg, var(--bg-card) 25%, rgba(255,255,255,0.05) 50%, var(--bg-card) 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 8px;
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class AdminEscrowLogsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  Math = Math;

  escrowLogs = signal<any[]>([]);
  totalCount = signal<number>(0);
  totalEscrowAmount = signal<number>(0);
  currentPage = signal<number>(1);
  pageSize = 15;
  isLoading = signal<boolean>(true);

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize));

  ngOnInit() {
    this.loadLogs(1);
  }

  loadLogs(page: number) {
    this.isLoading.set(true);
    this.http.get<any>(`${API_BASE_URL}/admin/escrow-logs?page=${page}&pageSize=${this.pageSize}`).subscribe({
      next: (res) => {
        this.escrowLogs.set(res.items);
        this.totalCount.set(res.totalCount);
        this.totalEscrowAmount.set(res.totalEscrowAmount);
        this.currentPage.set(page);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Lỗi khi tải dữ liệu log ký quỹ');
        this.isLoading.set(false);
      }
    });
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '0 ₫';
    return value.toLocaleString('vi-VN') + ' ₫';
  }

  getStatusName(status: string): string {
    switch (status) {
      case 'Open': return 'Đang mở';
      case 'InProgress': return 'Đang thực hiện';
      case 'PendingConfirmation': return 'Chờ duyệt xong';
      case 'Completed': return 'Đã hoàn thành';
      case 'Closed': return 'Đã đóng';
      case 'Draft': return 'Bản nháp';
      case 'Disputed': return 'Có tranh chấp';
      default: return status;
    }
  }

  getStatusStyle(status: string): string {
    switch (status) {
      case 'Open': return 'background: rgba(59, 130, 246, 0.1); color: #3B82F6;';
      case 'InProgress': return 'background: rgba(139, 92, 246, 0.1); color: #8B5CF6;';
      case 'PendingConfirmation': return 'background: rgba(245, 158, 11, 0.1); color: #D97706;';
      case 'Disputed': return 'background: rgba(239, 68, 68, 0.1); color: #EF4444;';
      default: return 'background: rgba(107, 114, 128, 0.1); color: #6B7280;';
    }
  }
}
