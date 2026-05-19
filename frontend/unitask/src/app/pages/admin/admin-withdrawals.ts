import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';

interface Withdrawal {
  id: number;
  amount: number;
  createdAt: string;
  userName: string;
  userEmail: string;
  isCompleted: boolean;
  bank: string;
  accountNo: string;
  accountName: string;
  fullDescription: string;
}

@Component({
  selector: 'app-admin-withdrawals',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="admin-page animate-fade-in">
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
            <a routerLink="/admin/dashboard" class="admin-tab">
              <span class="material-icons-round">dashboard</span> Dashboard
            </a>
            <a routerLink="/admin/users" class="admin-tab">
              <span class="material-icons-round">people</span> Quản lý User
            </a>
            <a routerLink="/admin/withdrawals" class="admin-tab active">
              <span class="material-icons-round">account_balance_wallet</span> Duyệt rút tiền
            </a>
          </div>

          <div class="dashboard-header animate-fade-in-up">
            <h1>Quản lý <span class="gradient-text">Duyệt rút tiền</span></h1>
            <p>Xử lý yêu cầu giải ngân tài khoản của Sinh viên</p>
          </div>

          <!-- Summary Cards -->
          <div class="stats-grid animate-fade-in-up" style="animation-delay:0.1s">
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#F59E0B,#F97316)">
                <span class="material-icons-round">pending_actions</span>
              </div>
              <div>
                <span class="stat-number text-orange">{{ formatCurrency(totalPendingAmount()) }}</span>
                <span class="stat-label">Chờ duyệt chi ({{ pendingCount() }} y/c)</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#10B981,#059669)">
                <span class="material-icons-round">check_circle</span>
              </div>
              <div>
                <span class="stat-number text-green">{{ formatCurrency(totalCompletedAmount()) }}</span>
                <span class="stat-label">Đã giải ngân ({{ completedCount() }} y/c)</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#4F46E5,#7C3AED)">
                <span class="material-icons-round">payments</span>
              </div>
              <div>
                <span class="stat-number">{{ formatCurrency(totalWithdrawalAmount()) }}</span>
                <span class="stat-label">Tổng yêu cầu rút ({{ withdrawals().length }} y/c)</span>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="main-content-section glass-card animate-fade-in-up" style="animation-delay:0.15s">
            <div class="filter-bar d-flex justify-between items-center mb-6">
              <div class="tab-filters">
                <button class="filter-btn" [class.active]="activeFilter() === 'all'" (click)="activeFilter.set('all')">
                  Tất cả ({{ withdrawals().length }})
                </button>
                <button class="filter-btn" [class.active]="activeFilter() === 'pending'" (click)="activeFilter.set('pending')">
                  Chờ chuyển tiền ({{ pendingCount() }})
                </button>
                <button class="filter-btn" [class.active]="activeFilter() === 'completed'" (click)="activeFilter.set('completed')">
                  Đã giải ngân ({{ completedCount() }})
                </button>
              </div>
              <button class="refresh-btn btn btn-secondary btn-sm" (click)="loadWithdrawals()">
                <span class="material-icons-round spinner-icon">sync</span> Làm mới
              </button>
            </div>

            @if (filteredWithdrawals().length === 0) {
              <div class="empty-state">
                <span class="material-icons-round">account_balance_wallet</span>
                <p>Không tìm thấy yêu cầu rút tiền nào.</p>
              </div>
            } @else {
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Sinh viên</th>
                      <th>Số tiền rút</th>
                      <th>Ngân hàng</th>
                      <th>Số tài khoản</th>
                      <th>Chủ tài khoản</th>
                      <th>Thời gian y/c</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (w of filteredWithdrawals(); track w.id) {
                      <tr>
                        <!-- Sinh viên -->
                        <td>
                          <div class="student-info">
                            <span class="student-name">{{ w.userName }}</span>
                            <span class="student-email">{{ w.userEmail }}</span>
                          </div>
                        </td>

                        <!-- Số tiền -->
                        <td>
                          <div class="d-flex items-center gap-1">
                            <strong class="withdraw-amount">{{ formatCurrency(w.amount) }}</strong>
                            <button class="copy-mini-btn" (click)="copyText(w.amount.toString(), 'Số tiền')" title="Copy số tiền">
                              <span class="material-icons-round">content_copy</span>
                            </button>
                          </div>
                        </td>

                        <!-- Ngân hàng -->
                        <td>
                          <span class="bank-tag">{{ w.bank }}</span>
                        </td>

                        <!-- Số tài khoản -->
                        <td>
                          <div class="d-flex items-center gap-2">
                            <code class="account-code">{{ w.accountNo }}</code>
                            <button class="copy-mini-btn" (click)="copyText(w.accountNo, 'Số tài khoản')" title="Copy STK">
                              <span class="material-icons-round">content_copy</span>
                            </button>
                          </div>
                        </td>

                        <!-- Chủ tài khoản -->
                        <td>
                          <div class="d-flex items-center gap-1">
                            <span class="owner-name">{{ w.accountName }}</span>
                            <button class="copy-mini-btn" (click)="copyText(w.accountName, 'Tên chủ tài khoản')" title="Copy tên chủ TK">
                              <span class="material-icons-round">content_copy</span>
                            </button>
                          </div>
                        </td>

                        <!-- Thời gian -->
                        <td>
                          <span class="date-text">{{ w.createdAt }}</span>
                        </td>

                        <!-- Trạng thái -->
                        <td>
                          @if (w.isCompleted) {
                            <span class="badge badge-success">Đã giải ngân</span>
                          } @else {
                            <span class="badge badge-warning">Chờ chuyển tiền</span>
                          }
                        </td>

                        <!-- Thao tác -->
                        <td>
                          @if (w.isCompleted) {
                            <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.6; cursor: not-allowed;">
                              <span class="material-icons-round">done_all</span> Đã chuyển
                            </button>
                          } @else {
                            <button class="btn btn-success btn-sm btn-action" (click)="confirmPayout(w)">
                              <span class="material-icons-round">send</span> Xác nhận đã chuyển
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </div>
    </section>

    <!-- Confirm Modal -->
    @if (selectedWithdrawal()) {
      <div class="modal-overlay animate-fade-in">
        <div class="modal-content glass-card p-6" style="width: 100%; max-width: 480px; text-align: center;">
          <span class="material-icons-round text-green" style="font-size:64px; margin-bottom:16px">account_balance</span>
          <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Xác nhận chuyển tiền thành công</h3>
          
          <div class="payout-summary p-4 mb-6 rounded-lg text-left" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-light)">
            <p><strong>Người nhận:</strong> {{ selectedWithdrawal()?.userName }}</p>
            <p><strong>Số tiền:</strong> <span class="withdraw-amount">{{ formatCurrency(selectedWithdrawal()?.amount || 0) }}</span></p>
            <p><strong>Ngân hàng:</strong> {{ selectedWithdrawal()?.bank }}</p>
            <p><strong>Số tài khoản:</strong> <code>{{ selectedWithdrawal()?.accountNo }}</code></p>
            <p><strong>Chủ tài khoản:</strong> {{ selectedWithdrawal()?.accountName }}</p>
          </div>

          <p style="color:var(--text-secondary); margin-bottom:24px; font-size: 0.9rem;">
            Vui lòng chắc chắn rằng bạn đã thực hiện chuyển tiền thật qua ứng dụng Ngân hàng của bạn đến tài khoản trên trước khi bấm xác nhận.
          </p>

          <div class="form-actions d-flex justify-center gap-3">
            <button type="button" class="btn btn-secondary flex-1" (click)="selectedWithdrawal.set(null)">Hủy</button>
            <button type="button" class="btn btn-success flex-1" (click)="executePayout()">
              Xác nhận đã chuyển khoản
            </button>
          </div>
        </div>
      </div>
    }
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
      background: rgba(255, 255, 255, 0.05);
    }

    .admin-tab.active {
      color: #FFF;
      background: var(--primary);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }

    .admin-tab .material-icons-round { font-size: 18px; }

    .dashboard-header {
      margin-bottom: var(--space-8);
    }

    .dashboard-header h1 {
      font-size: 2.25rem;
      font-weight: 800;
      margin-bottom: var(--space-2);
    }

    .dashboard-header p {
      color: var(--text-muted);
      font-size: 1.05rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-6);
      margin-bottom: var(--space-8);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--space-5);
      padding: var(--space-6);
      border-radius: var(--radius-xl);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
    }

    .stat-icon .material-icons-round { font-size: 28px; }

    .stat-number {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .stat-label {
      color: var(--text-muted);
      font-size: var(--font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .text-orange { color: #F59E0B; }
    .text-green { color: #10B981; }

    /* Main Table Section */
    .main-content-section {
      padding: var(--space-6);
      border-radius: var(--radius-xl);
    }

    /* Filters */
    .filter-bar {
      border-bottom: 1px solid var(--border-light);
      padding-bottom: var(--space-4);
    }

    .tab-filters {
      display: flex;
      gap: var(--space-2);
    }

    .filter-btn {
      background: transparent;
      border: none;
      padding: var(--space-2) var(--space-4);
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
    }

    .filter-btn:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.03);
    }

    .filter-btn.active {
      color: var(--primary-light);
      background: rgba(79, 70, 229, 0.1);
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .spinner-icon {
      font-size: 16px;
    }

    /* Table styles */
    .table-wrapper {
      overflow-x: auto;
      margin-top: var(--space-4);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th, .data-table td {
      padding: var(--space-4);
      border-bottom: 1px solid var(--border-light);
      vertical-align: middle;
    }

    .data-table th {
      font-weight: 600;
      color: var(--text-muted);
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .data-table tbody tr:hover {
      background: rgba(255,255,255,0.01);
    }

    /* Column Styles */
    .student-info {
      display: flex;
      flex-direction: column;
    }

    .student-name {
      font-weight: 700;
      color: var(--text-primary);
    }

    .student-email {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .withdraw-amount {
      color: #EF4444;
      font-weight: 800;
    }

    .bank-tag {
      background: rgba(59, 130, 246, 0.1);
      color: #60A5FA;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: var(--font-size-xs);
      font-weight: 700;
    }

    .account-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: var(--font-size-sm);
      background: rgba(255,255,255,0.05);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-primary);
      font-weight: 600;
    }

    .owner-name {
      text-transform: uppercase;
      font-weight: 600;
      font-size: var(--font-size-sm);
    }

    .date-text {
      color: var(--text-muted);
      font-size: var(--font-size-xs);
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 700;
    }

    .badge-success {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
    }

    .badge-warning {
      background: rgba(245, 158, 11, 0.15);
      color: #F59E0B;
    }

    /* Action Buttons */
    .copy-mini-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      transition: all var(--transition-fast);
    }

    .copy-mini-btn:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.08);
    }

    .copy-mini-btn .material-icons-round {
      font-size: 14px;
    }

    .btn-success {
      background: #10B981;
      color: #FFF;
      border: none;
    }

    .btn-success:hover {
      background: #059669;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .btn-action {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }

    .empty-state {
      text-align: center;
      padding: var(--space-12);
      color: var(--text-muted);
    }

    .empty-state .material-icons-round {
      font-size: 48px;
      margin-bottom: var(--space-4);
    }

    /* Modal Overlay & Content */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }

    .modal-content {
      background: var(--bg-card);
      border-radius: var(--radius-xl);
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }

    .payout-summary p {
      margin-bottom: 8px;
      font-size: var(--font-size-sm);
    }

    .payout-summary p:last-child {
      margin-bottom: 0;
    }

    @media (max-width: 992px) {
      .stats-grid { grid-template-columns: 1fr; }
      .admin-nav { flex-direction: column; width: 100%; }
    }
  `]
})
export class AdminWithdrawalsComponent implements OnInit {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  withdrawals = signal<Withdrawal[]>([]);
  activeFilter = signal<'all' | 'pending' | 'completed'>('all');
  selectedWithdrawal = signal<Withdrawal | null>(null);

  filteredWithdrawals = computed(() => {
    const list = this.withdrawals();
    const filter = this.activeFilter();
    if (filter === 'pending') return list.filter(w => !w.isCompleted);
    if (filter === 'completed') return list.filter(w => w.isCompleted);
    return list;
  });

  totalPendingAmount = computed(() => {
    return this.withdrawals()
      .filter(w => !w.isCompleted)
      .reduce((sum, w) => sum + w.amount, 0);
  });

  totalCompletedAmount = computed(() => {
    return this.withdrawals()
      .filter(w => w.isCompleted)
      .reduce((sum, w) => sum + w.amount, 0);
  });

  totalWithdrawalAmount = computed(() => {
    return this.withdrawals().reduce((sum, w) => sum + w.amount, 0);
  });

  pendingCount = computed(() => this.withdrawals().filter(w => !w.isCompleted).length);
  completedCount = computed(() => this.withdrawals().filter(w => w.isCompleted).length);

  ngOnInit() {
    if (this.auth.isAdmin()) {
      this.loadWithdrawals();
    }
  }

  loadWithdrawals() {
    this.http.get<any[]>(`${API_BASE_URL}/admin/withdrawals`).subscribe({
      next: (data) => {
        const parsed = data.map(tx => this.parseWithdrawal(tx));
        this.withdrawals.set(parsed);
      },
      error: () => this.toast.error('Không thể tải danh sách yêu cầu rút tiền.')
    });
  }

  parseWithdrawal(tx: any): Withdrawal {
    const desc = tx.description || '';
    const isCompleted = desc.startsWith('[Completed]');
    
    const cleanDesc = isCompleted ? desc.substring('[Completed]'.length).trim() : desc;
    
    let bank = 'N/A';
    let accountNo = 'N/A';
    let accountName = 'N/A';
    
    try {
      if (cleanDesc.includes('NH ') && cleanDesc.includes(' - STK:')) {
        bank = cleanDesc.split('NH ')[1].split(' - STK:')[0].trim();
        const afterStk = cleanDesc.split(' - STK:')[1].trim();
        if (afterStk.includes('(') && afterStk.includes(')')) {
          accountNo = afterStk.split('(')[0].trim();
          accountName = afterStk.substring(afterStk.indexOf('(') + 1, afterStk.lastIndexOf(')')).trim();
        } else {
          accountNo = afterStk;
        }
      }
    } catch (e) {
      console.error('Failed to parse bank details:', e);
    }

    return {
      id: tx.id,
      amount: tx.amount,
      createdAt: tx.createdAt,
      userName: tx.userName || 'Sinh viên',
      userEmail: tx.userEmail || '',
      isCompleted,
      bank,
      accountNo,
      accountName,
      fullDescription: cleanDesc
    };
  }

  confirmPayout(withdrawal: Withdrawal) {
    this.selectedWithdrawal.set(withdrawal);
  }

  executePayout() {
    const withdrawal = this.selectedWithdrawal();
    if (!withdrawal) return;

    this.http.put<any>(`${API_BASE_URL}/admin/withdrawals/${withdrawal.id}/complete`, {}).subscribe({
      next: (res) => {
        this.toast.success('Xác nhận giải ngân thành công!');
        this.selectedWithdrawal.set(null);
        this.loadWithdrawals(); // Reload list
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Có lỗi xảy ra khi xác nhận chuyển tiền.');
      }
    });
  }

  copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.toast.success(`Đã sao chép ${label}!`);
    });
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('vi-VN') + 'đ';
  }
}
