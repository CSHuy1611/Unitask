import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';

@Component({
  selector: 'app-admin-revenue',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="admin-page-content">
          <div class="dashboard-header animate-fade-in-up">
            <h1>Báo cáo <span class="gradient-text">Doanh Thu & Dòng Tiền</span></h1>
            <p>Kiểm tra chi tiết giao dịch và xuất báo cáo Excel</p>
          </div>

          <!-- Export Actions & Filters -->
          <div class="filter-actions glass-card animate-fade-in-up" style="animation-delay:0.1s; margin-bottom: var(--space-6);">
            <div class="filters-grid">
              <div class="form-group custom-input-group">
                <label><span class="material-icons-round">calendar_today</span> Từ ngày</label>
                <div class="input-with-icon">
                  <input type="date" class="form-control custom-input" [(ngModel)]="startDate" />
                </div>
              </div>
              
              <div class="form-group custom-input-group">
                <label><span class="material-icons-round">event</span> Đến ngày</label>
                <div class="input-with-icon">
                  <input type="date" class="form-control custom-input" [(ngModel)]="endDate" />
                </div>
              </div>

              <div class="form-group custom-input-group" style="flex: 1.5; min-width: 250px;">
                <label><span class="material-icons-round">filter_list</span> Lọc theo loại</label>
                <select class="form-control custom-input" [(ngModel)]="filterType" (ngModelChange)="loadTransactions(1)">
                  <option value="All">Tất cả giao dịch</option>
                  <option value="CashIn">Dòng tiền Nạp (Deposit)</option>
                  <option value="CashOut">Dòng tiền Rút (Withdrawal)</option>
                  <option value="Revenue">Doanh thu (Hoa hồng & Gói dịch vụ)</option>
                </select>
              </div>
              
              <div class="export-action">
                <button class="btn btn-primary export-btn" (click)="exportExcel()" [disabled]="isExporting()">
                  <span class="material-icons-round">file_download</span> 
                  {{ isExporting() ? 'Đang xuất...' : 'Xuất Excel' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Transactions Table -->
          <div class="transactions-section glass-card animate-fade-in-up" style="animation-delay:0.2s">
            <h3 style="margin-bottom: var(--space-6); display: flex; align-items: center; gap: var(--space-2);">
              <span class="material-icons-round" style="color:var(--primary-light)">list_alt</span> Lịch sử giao dịch
            </h3>
            
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ngày GD</th>
                    <th>Khách hàng</th>
                    <th>Email</th>
                    <th>Loại GD</th>
                    <th>Số tiền</th>
                    <th>Mô tả / Tham chiếu</th>
                  </tr>
                </thead>
                <tbody>
                  @if (isLoading()) {
                    <tr><td colspan="6" class="text-center py-8">Đang tải dữ liệu...</td></tr>
                  } @else if (transactions().length === 0) {
                    <tr><td colspan="6" class="text-center py-8">Chưa có giao dịch nào</td></tr>
                  } @else {
                    @for (item of transactions(); track item.id) {
                      <tr>
                        <td>{{ item.createdAt + 'Z' | date:'dd/MM/yyyy HH:mm' }}</td>
                        <td>{{ item.fullName }}</td>
                        <td>{{ item.email }}</td>
                        <td>
                          <span class="status-badge" [class]="getTypeBadgeClass(item.type)">
                            {{ getTypeLabel(item.type) }}
                          </span>
                        </td>
                        <td [class.text-success]="item.amount > 0" [class.text-danger]="item.amount < 0">
                          <strong>{{ formatCurrency(item.amount) }}</strong>
                        </td>
                        <td style="max-width: 300px;">
                          <div style="white-space: normal; word-break: break-word; line-height: 1.4;">{{ item.description || '-' }}</div>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="btn btn-outline btn-sm" [disabled]="currentPage() === 1" (click)="loadTransactions(currentPage() - 1)">
                  Trước
                </button>
                <span class="page-info">Trang {{ currentPage() }} / {{ totalPages() }}</span>
                <button class="btn btn-outline btn-sm" [disabled]="!hasMore()" (click)="loadTransactions(currentPage() + 1)">
                  Sau
                </button>
              </div>
            }
          </div>

    </div>
  `,
  styles: [`
    .admin-page-content {
      width: 100%;
    }

    .glass-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-xl);
      padding: var(--space-6);
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
    }

    .dashboard-header {
      margin-bottom: var(--space-8);
    }

    .dashboard-header h1 {
      font-size: var(--font-size-3xl);
      margin-bottom: var(--space-2);
    }

    .dashboard-header p {
      color: var(--text-muted);
    }

    .table-wrapper {
      overflow-x: auto;
      background: rgba(15, 23, 42, 0.4);
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255,255,255,0.05);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th, .data-table td {
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .data-table th {
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(255,255,255,0.02);
    }

    .data-table tr:last-child td {
      border-bottom: none;
    }

    .data-table tbody tr:hover {
      background: rgba(255,255,255,0.02);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 600;
      display: inline-block;
      white-space: nowrap;
    }

    .status-badge.deposit { background: rgba(16, 185, 129, 0.15); color: #10B981; }
    .status-badge.withdrawal { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
    .status-badge.commission { background: rgba(99, 102, 241, 0.15); color: #6366F1; }
    .status-badge.subscription { background: rgba(139, 92, 246, 0.15); color: #8B5CF6; }
    .status-badge.default { background: rgba(100, 116, 139, 0.15); color: #94A3B8; }

    .text-success { color: #10B981; }
    .text-danger { color: #EF4444; }

    .truncate-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--space-4);
      margin-top: var(--space-6);
    }

    .page-info {
      font-weight: 600;
      color: var(--text-secondary);
    }

    .custom-input-group {
      margin-bottom: 0;
      width: 100%;
    }

    .custom-input-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.85rem;
      margin-bottom: 8px;
    }

    .custom-input-group label .material-icons-round {
      font-size: 16px;
      color: var(--primary-light);
    }

    .custom-input {
      background: rgba(15, 23, 42, 0.6) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: var(--text-primary) !important;
      border-radius: var(--radius-md) !important;
      padding: 10px 16px !important;
      height: 44px !important;
      font-size: 0.95rem !important;
      transition: all 0.3s ease !important;
      width: 100%;
    }

    .custom-input:focus {
      border-color: var(--primary-light) !important;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15) !important;
      outline: none !important;
      background: rgba(15, 23, 42, 0.8) !important;
    }

    /* Fix Date Picker Icon in Dark Mode */
    .custom-input::-webkit-calendar-picker-indicator {
      filter: invert(1) opacity(0.7);
      cursor: pointer;
    }
    
    .custom-input::-webkit-calendar-picker-indicator:hover {
      filter: invert(1) opacity(1);
    }

    .custom-input option {
      background: #1e293b;
      color: var(--text-primary);
      padding: var(--space-6);
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
    }

    

    

    

    

    

    .dashboard-header {
      margin-bottom: var(--space-8);
    }

    .dashboard-header h1 {
      font-size: var(--font-size-3xl);
      margin-bottom: var(--space-2);
    }

    .dashboard-header p {
      color: var(--text-muted);
    }

    .table-wrapper {
      overflow-x: auto;
      background: rgba(15, 23, 42, 0.4);
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255,255,255,0.05);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th, .data-table td {
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .data-table th {
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(255,255,255,0.02);
    }

    .data-table tr:last-child td {
      border-bottom: none;
    }

    .data-table tbody tr:hover {
      background: rgba(255,255,255,0.02);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 600;
      display: inline-block;
    }

    .status-badge.deposit { background: rgba(16, 185, 129, 0.15); color: #10B981; }
    .status-badge.withdrawal { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
    .status-badge.commission { background: rgba(99, 102, 241, 0.15); color: #6366F1; }
    .status-badge.subscription { background: rgba(139, 92, 246, 0.15); color: #8B5CF6; }
    .status-badge.default { background: rgba(100, 116, 139, 0.15); color: #94A3B8; }

    .text-success { color: #10B981; }
    .text-danger { color: #EF4444; }

    .truncate-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--space-4);
      margin-top: var(--space-6);
    }

    .page-info {
      font-weight: 600;
      color: var(--text-secondary);
    }

    .custom-input-group {
      margin-bottom: 0;
      width: 100%;
    }

    .custom-input-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.85rem;
      margin-bottom: 8px;
    }

    .custom-input-group label .material-icons-round {
      font-size: 16px;
      color: var(--primary-light);
    }

    .custom-input {
      background: rgba(15, 23, 42, 0.6) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: var(--text-primary) !important;
      border-radius: var(--radius-md) !important;
      padding: 10px 16px !important;
      height: 44px !important;
      font-size: 0.95rem !important;
      transition: all 0.3s ease !important;
      width: 100%;
    }

    .custom-input:focus {
      border-color: var(--primary-light) !important;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15) !important;
      outline: none !important;
      background: rgba(15, 23, 42, 0.8) !important;
    }

    /* Fix Date Picker Icon in Dark Mode */
    .custom-input::-webkit-calendar-picker-indicator {
      filter: invert(1) opacity(0.7);
      cursor: pointer;
    }
    
    .custom-input::-webkit-calendar-picker-indicator:hover {
      filter: invert(1) opacity(1);
    }

    .custom-input option {
      background: #1e293b;
      color: var(--text-primary);
    }

    .filters-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      align-items: flex-end;
    }

    .filters-grid .custom-input-group {
      flex: 1;
      min-width: 180px;
    }

    .export-action {
      display: flex;
      align-items: flex-end;
    }

    .export-btn {
      height: 44px;
      padding: 0 var(--space-6);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 600;
      border-radius: var(--radius-md);
      background: var(--primary-gradient);
      color: white;
      border: none;
      transition: all 0.3s ease;
      cursor: pointer;
      white-space: nowrap;
    }

    .export-btn:hover:not(:disabled) {
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      transform: translateY(-1px);
    }

    .export-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .filters-grid {
        flex-direction: column;
        align-items: stretch;
      }
      .export-action {
        width: 100%;
      }
      .export-btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class AdminRevenueComponent implements OnInit {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  transactions = signal<any[]>([]);
  totalCount = signal<number>(0);
  currentPage = signal<number>(1);
  pageSize = 10;
  hasMore = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isExporting = signal<boolean>(false);

  startDate = '';
  endDate = '';
  filterType = 'All';

  ngOnInit() {
    if (this.auth.isAdmin()) {
      this.loadTransactions(1);
    }
  }

  loadTransactions(page: number) {
    this.isLoading.set(true);
    this.currentPage.set(page);

    this.http.get<any>(`${API_BASE_URL}/admin/transactions?page=${page}&pageSize=${this.pageSize}&type=${this.filterType}`).subscribe({
      next: (res) => {
        this.transactions.set(res.items);
        this.totalCount.set(res.totalCount);
        this.hasMore.set(res.hasMore);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load transactions', err);
        this.toast.error('Lỗi khi tải dữ liệu giao dịch');
        this.isLoading.set(false);
      }
    });
  }

  totalPages() {
    return Math.ceil(this.totalCount() / this.pageSize) || 1;
  }

  exportExcel() {
    this.isExporting.set(true);
    
    let url = `${API_BASE_URL}/admin/transactions/export?`;
    if (this.startDate) url += `startDate=${this.startDate}&`;
    if (this.endDate) url += `endDate=${this.endDate}&`;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const now = new Date();
        const dateStr = now.toISOString().slice(0,10).replace(/-/g,'');
        link.download = `UniTask_DoanhThu_${dateStr}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        
        this.toast.success('Đã tải xuống báo cáo Excel');
        this.isExporting.set(false);
      },
      error: (err) => {
        console.error('Failed to export excel', err);
        this.toast.error('Lỗi khi xuất file Excel');
        this.isExporting.set(false);
      }
    });
  }

  formatCurrency(amount: number): string {
    return Math.abs(amount).toLocaleString('vi-VN') + 'đ';
  }

  getTypeLabel(type: number): string {
    switch (type) {
      case 0: return 'Nạp tiền';
      case 1: return 'Phí đăng tin';
      case 2: return 'Tạm giữ tiền';
      case 3: return 'Giải phóng tiền';
      case 4: return 'Phí hoa hồng';
      case 5: return 'Hoàn tiền';
      case 6: return 'Rút tiền';
      case 7: return 'Gói dịch vụ';
      default: return 'Khác';
    }
  }

  getTypeBadgeClass(type: number): string {
    switch (type) {
      case 0: return 'deposit';
      case 6: return 'withdrawal';
      case 1: case 4: return 'commission';
      case 7: return 'subscription';
      default: return 'default';
    }
  }
}
