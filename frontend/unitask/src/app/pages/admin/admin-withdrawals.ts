import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';
import { AdminSearchService } from '../../services/admin-search.service';

interface Withdrawal {
  id: number;
  amount: number;
  createdAt: string;
  userName: string;
  userEmail: string;
  isCompleted?: boolean;
  bank: string;
  accountNo: string;
  accountName: string;
  fullDescription: string;
  status?: 'pending' | 'processing' | 'completed';
  userRole?: string;
  employerType?: number | null;
}

@Component({
  selector: 'app-admin-withdrawals',
  standalone: true,
  imports: [],
  template: `
    <div class="admin-page-content animate-fade-in">

          <div class="dashboard-header animate-fade-in-up">
            <h1>Quản lý <span class="gradient-text">Duyệt rút tiền</span></h1>
            <p>Xử lý yêu cầu giải ngân tài khoản người dùng</p>
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
                <span class="stat-label">Tổng yêu cầu rút ({{ totalWithdrawalsCount() }} y/c)</span>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="main-content-section glass-card animate-fade-in-up" style="animation-delay:0.15s">
            <div class="filter-bar d-flex justify-between items-center mb-6" style="flex-wrap: wrap; gap: 12px;">
              <div class="tab-filters" style="display: flex; flex-wrap: wrap; gap: 4px;">
                <button class="filter-btn" [class.active]="activeFilter() === 'all'" (click)="activeFilter.set('all')">
                  Tất cả ({{ totalWithdrawalsCount() }})
                </button>
                <button class="filter-btn" [class.active]="activeFilter() === 'pending'" (click)="activeFilter.set('pending')">
                  Chờ gom ({{ pendingCount() }})
                </button>
                <button class="filter-btn" [class.active]="activeFilter() === 'processing'" (click)="activeFilter.set('processing')">
                  Đang xử lý ({{ processingCount() }})
                </button>
                <button class="filter-btn" [class.active]="activeFilter() === 'completed'" (click)="activeFilter.set('completed')">
                  Đã giải ngân ({{ completedCount() }})
                </button>
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-primary btn-sm" (click)="batchProcessWithdrawals()" style="background: linear-gradient(135deg, var(--primary-light), var(--primary)); display: flex; align-items: center; gap: 4px;">
                  <span class="material-icons-round" style="font-size:16px;">rule</span> Gom lệnh rút tiền
                </button>
                <button type="button" class="refresh-btn btn btn-secondary btn-sm" (click)="loadWithdrawals(1)">
                  <span class="material-icons-round spinner-icon">sync</span> Làm mới
                </button>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
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
                  @if (isLoading() && filteredWithdrawals().length === 0) {
                    <tr>
                      <td colspan="8">
                        <div class="skeleton skeleton-card"></div>
                      </td>
                    </tr>
                  } @else if (filteredWithdrawals().length === 0) {
                    <tr>
                      <td colspan="8">
                        <div class="empty-state" style="padding: 40px; border: none;">
                          <span class="material-icons-round">account_balance_wallet</span>
                          <p>Không tìm thấy yêu cầu rút tiền nào.</p>
                        </div>
                      </td>
                    </tr>
                  } @else {
                    @for (w of filteredWithdrawals(); track w.id) {
                      <tr>
                        <!-- Người dùng -->
                        <td>
                          <div class="student-info">
                            <span class="student-name">{{ w.userName }}</span>
                            <span class="student-email">{{ w.userEmail }}</span>
                            <span class="role-tag" [style.color]="w.userRole === 'student' ? '#3B82F6' : (w.employerType === 1 ? '#F59E0B' : '#10B981')" [style.borderColor]="w.userRole === 'student' ? 'rgba(59,130,246,0.3)' : (w.employerType === 1 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)')">
                              {{ w.userRole === 'student' ? 'Sinh viên' : (w.employerType === 1 ? 'Hộ KD' : 'Doanh nghiệp') }}
                            </span>
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
                          <div style="display: flex; align-items: center; gap: 12px;">
                            @if (getBankLogo(w.bank)) {
                              <img [src]="getBankLogo(w.bank)" alt="Bank Logo" style="height: 36px; width: auto; max-width: 100px; object-fit: contain;">
                            } @else {
                              <span class="material-icons-round" style="color: var(--text-muted); font-size: 28px;">account_balance</span>
                            }
                            <span class="bank-tag" style="background: rgba(var(--primary-rgb), 0.1); color: var(--primary); font-size: 0.85rem; padding: 4px 8px;">
                              {{ w.bank }}
                            </span>
                          </div>
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
                          @if (w.status === 'completed') {
                            <span class="badge badge-success">Đã giải ngân</span>
                          } @else if (w.status === 'processing') {
                            <span class="badge badge-warning" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3)">Gom lệnh (Quét mã)</span>
                          } @else {
                            <span class="badge badge-secondary" style="background: rgba(107, 114, 128, 0.15); color: #9CA3AF; border: 1px solid rgba(107, 114, 128, 0.3)">Chờ gom lệnh</span>
                          }
                        </td>

                        <!-- Thao tác -->
                        <td>
                          @if (w.status === 'completed') {
                            <button type="button" class="btn btn-secondary btn-sm" disabled style="opacity: 0.6; cursor: not-allowed;">
                              <span class="material-icons-round">done_all</span> Đã chuyển
                            </button>
                          } @else if (w.status === 'processing') {
                            <button type="button" class="btn btn-success btn-sm btn-action" (click)="confirmPayout(w)" style="background: var(--warning)">
                              <span class="material-icons-round">qr_code_2</span> Quét & Chuyển
                            </button>
                          } @else {
                            <button type="button" class="btn btn-secondary btn-sm" disabled style="opacity: 0.6; cursor: not-allowed;">
                              <span class="material-icons-round">rule</span> Chờ gom lệnh
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            
            @if (hasMore()) {
              <div style="text-align: center; margin-top: var(--space-6); margin-bottom: var(--space-2);">
                <button class="btn btn-secondary btn-sm" (click)="loadMore()" [disabled]="isLoading()" style="display: inline-flex; align-items: center; gap: 8px;">
                  @if (isLoading()) {
                    <span class="material-icons-round spinner-icon" style="font-size:16px;">sync</span> Đang tải...
                  } @else {
                    <span class="material-icons-round" style="font-size:16px;">expand_more</span> Tải thêm
                  }
                </button>
              </div>
            }
          </div>

    <!-- Confirm Modal -->
    @if (selectedWithdrawal()) {
      <div class="modal-backdrop" (click)="selectedWithdrawal.set(null)">
        <div class="modal-panel p-6" (click)="$event.stopPropagation()" style="text-align: center;">
          <span class="material-icons-round text-green" style="font-size:64px; margin-bottom:16px">account_balance</span>
          <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Xác nhận chuyển tiền thành công</h3>
          
          <div class="payout-summary p-4 mb-6 rounded-lg text-left" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-light)">
            <p><strong>Người nhận:</strong> {{ selectedWithdrawal()?.userName }}</p>
            <p><strong>Số tiền:</strong> <span class="withdraw-amount">{{ formatCurrency(selectedWithdrawal()?.amount || 0) }}</span></p>
            <p><strong>Ngân hàng:</strong> {{ selectedWithdrawal()?.bank }}</p>
            <p><strong>Số tài khoản:</strong> <code>{{ selectedWithdrawal()?.accountNo }}</code></p>
            <p><strong>Chủ tài khoản:</strong> {{ selectedWithdrawal()?.accountName }}</p>
          </div>

          @if (selectedWithdrawal()?.status === 'processing') {
            <div class="vietqr-box mb-6 p-4 rounded-lg" style="background: white; border: 1px solid var(--border-light); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
              <span style="color: #1f2937; font-size: 13px; font-weight: 600;">Quét mã VietQR chuyển khoản nhanh</span>
              <img [src]="getVietQrUrl(selectedWithdrawal()!)" alt="VietQR code" style="max-width: 240px; width: 100%; height: auto; border-radius: 8px;" />
              <span style="color: #6b7280; font-size: 11px;">Nội dung chuyển khoản (Memo): <strong>STPAY{{ selectedWithdrawal()?.id }}</strong></span>
            </div>
          }

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
    .admin-page-content {
      width: 100%;
    }

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

    .role-tag {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 700;
      border-radius: var(--radius-full);
      border: 1px solid transparent;
      width: fit-content;
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

    .data-table thead th {
      position: sticky;
      top: 0;
      z-index: 5;
      background: var(--bg-card);
      box-shadow: 0 1px 0 var(--border-light);
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
  private searchService = inject(AdminSearchService);

  withdrawals = signal<Withdrawal[]>([]);
  activeFilter = signal<'all' | 'pending' | 'processing' | 'completed'>('all');
  selectedWithdrawal = signal<Withdrawal | null>(null);

  currentPage = signal<number>(1);
  pageSize = 10;
  hasMore = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isCheckingPayos = signal<boolean>(false);
  payosCheckResult = signal<any>(null);

  banks = signal<any[]>([]);
  isBanksLoading = signal(true);
  totalPendingAmount = signal<number>(0);
  totalProcessingAmount = signal<number>(0);
  totalCompletedAmount = signal<number>(0);
  totalWithdrawalAmount = signal<number>(0);
  pendingCount = signal<number>(0);
  processingCount = signal<number>(0);
  completedCount = signal<number>(0);
  totalWithdrawalsCount = signal<number>(0);

  filteredWithdrawals = computed(() => {
    let list = this.withdrawals();
    if (this.activeFilter() !== 'all') {
      list = list.filter(w => w.status === this.activeFilter());
    }
    
    const query = this.searchService.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter((w: any) => 
        (w.userName || '').toLowerCase().includes(query) ||
        (w.userEmail || '').toLowerCase().includes(query) ||
        (w.accountName || '').toLowerCase().includes(query) ||
        (w.accountNo || '').toLowerCase().includes(query)
      );
    }
    
    return list;
  });

  ngOnInit() {
    this.loadBanks();
    if (this.auth.isAdmin()) {
      this.loadWithdrawals();
    }
  }

  loadBanks() {
    this.isBanksLoading.set(true);
    this.http.get<any>('https://api.vietqr.io/v2/banks').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.banks.set(res.data);
        }
        this.isBanksLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load VietQR banks', err);
        this.isBanksLoading.set(false);
      }
    });
  }

  getBankLogo(bankName: string | null | undefined): string | null {
    if (!bankName || bankName === 'N/A') return null;
    const nameLower = bankName.toLowerCase().trim();
    const bankList = this.banks();
    
    if (bankList.length === 0) return null;

    // 1. Try exact match on shortName or code
    let match = bankList.find(b => 
      b.shortName?.toLowerCase() === nameLower || 
      b.code?.toLowerCase() === nameLower
    );
    
    // 2. Try partial match on shortName
    if (!match) {
      match = bankList.find(b => b.shortName && nameLower.includes(b.shortName.toLowerCase()));
    }
    
    // 3. Try partial match on full name
    if (!match) {
      match = bankList.find(b => b.name && (b.name.toLowerCase().includes(nameLower) || nameLower.includes(b.name.toLowerCase())));
    }

    // Edge cases mapping
    if (!match && nameLower.includes('mb')) {
      match = bankList.find(b => b.code === 'MB');
    }
    if (!match && nameLower.includes('vietcombank')) {
      match = bankList.find(b => b.code === 'VCB');
    }
    if (!match && nameLower.includes('techcombank')) {
      match = bankList.find(b => b.code === 'TCB');
    }
    if (!match && nameLower.includes('mbbank')) {
      match = bankList.find(b => b.code === 'MB');
    }
    
    return match ? match.logo : null;
  }

  loadWithdrawals(page: number = 1) {
    this.isLoading.set(true);
    this.http.get<any>(`${API_BASE_URL}/admin/withdrawals?page=${page}&pageSize=${this.pageSize}`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const dataItems = Array.isArray(res) ? res : (res?.items || []);
        const parsed = dataItems.map((tx: any) => this.parseWithdrawal(tx));
        
        if (page === 1) {
          this.withdrawals.set(parsed);
        } else {
          this.withdrawals.update(current => [...current, ...parsed]);
        }
        
        this.currentPage.set(page);
        this.hasMore.set(Array.isArray(res) ? false : (res?.hasMore || false));

        if (Array.isArray(res)) {
          // Compute client-side totals
          const pending = parsed.filter((w: Withdrawal) => w.status === 'pending');
          const processing = parsed.filter((w: Withdrawal) => w.status === 'processing');
          const completed = parsed.filter((w: Withdrawal) => w.status === 'completed');
          
          this.totalPendingAmount.set(pending.reduce((acc: number, w: Withdrawal) => acc + Math.abs(w.amount), 0));
          this.pendingCount.set(pending.length);

          this.totalProcessingAmount.set(processing.reduce((acc: number, w: Withdrawal) => acc + Math.abs(w.amount), 0));
          this.processingCount.set(processing.length);
          
          this.totalCompletedAmount.set(completed.reduce((acc: number, w: Withdrawal) => acc + Math.abs(w.amount), 0));
          this.completedCount.set(completed.length);
          
          this.totalWithdrawalAmount.set(parsed.reduce((acc: number, w: Withdrawal) => acc + Math.abs(w.amount), 0));
          this.totalWithdrawalsCount.set(parsed.length);
        } else {
          // Update counts and totals from backend response
          this.totalPendingAmount.set(res.totalPendingAmount || 0);
          this.totalProcessingAmount.set(res.totalProcessingAmount || 0);
          this.totalCompletedAmount.set(res.totalCompletedAmount || 0);
          this.totalWithdrawalAmount.set(res.totalWithdrawalAmount || 0);
          this.pendingCount.set(res.pendingCount || 0);
          this.processingCount.set(res.processingCount || 0);
          this.completedCount.set(res.completedCount || 0);
          this.totalWithdrawalsCount.set(res.totalCount || 0);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Không thể tải danh sách yêu cầu rút tiền.');
      }
    });
  }

  loadMore() {
    this.loadWithdrawals(this.currentPage() + 1);
  }

  parseWithdrawal(tx: any): Withdrawal {
    const cleanDesc = tx.description || '';
    const status = tx.status || 'pending';
    
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
      userName: tx.userName || 'N/A',
      userEmail: tx.userEmail || '',
      status,
      bank,
      accountNo,
      accountName,
      fullDescription: cleanDesc,
      userRole: tx.userRole,
      employerType: tx.employerType
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
        this.loadWithdrawals(1);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Có lỗi xảy ra khi xác nhận chuyển tiền.');
      }
    });
  }

  batchProcessWithdrawals() {
    this.toast.success('Đang thực hiện gom lệnh rút tiền...');
    this.http.post<any>(`${API_BASE_URL}/admin/withdrawals/batch-process`, {}).subscribe({
      next: (res) => {
        this.toast.success('Đã gom các lệnh rút tiền thành công!');
        this.loadWithdrawals(1);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Có lỗi xảy ra khi gom lệnh rút tiền.');
      }
    });
  }

  getVietQrUrl(w: Withdrawal): string {
    const bankShort = this.getBankShortName(w.bank);
    const amountVal = w.amount;
    const memo = `STPAY${w.id}`;
    const nameEncoded = encodeURIComponent(w.accountName);
    return `https://img.vietqr.io/image/${bankShort}-${w.accountNo}-compact.png?amount=${amountVal}&addInfo=${memo}&accountName=${nameEncoded}`;
  }

  getBankShortName(bank: string): string {
    const mapping: Record<string, string> = {
      'vietcombank': 'VCB',
      'vcb': 'VCB',
      'techcombank': 'TCB',
      'tcb': 'TCB',
      'mb': 'MB',
      'mbbank': 'MB',
      'vietinbank': 'ICB',
      'ctg': 'ICB',
      'icb': 'ICB',
      'bidv': 'BIDV',
      'agribank': 'VBA',
      'vba': 'VBA',
      'acb': 'ACB',
      'tpbank': 'TPB',
      'tpb': 'TPB',
      'vpbank': 'VPB',
      'vpb': 'VPB',
      'sacombank': 'STB',
      'stb': 'STB',
      'hdbank': 'HDB',
      'hdb': 'HDB',
      'shb': 'SHB',
      'vib': 'VIB',
      'msb': 'MSB',
      'ocb': 'OCB',
      'lpbank': 'LPB',
      'lpb': 'LPB'
    };
    return mapping[bank.toLowerCase().trim()] || bank;
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
