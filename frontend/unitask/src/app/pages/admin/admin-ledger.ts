import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';
import { AdminSearchService } from '../../services/admin-search.service';

@Component({
  selector: 'app-admin-ledger',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
    <div class="admin-page-content">
          <div class="dashboard-header animate-fade-in-up">
            <h1>Sổ Cái <span class="gradient-text">Giao Dịch Toàn Hệ Thống</span></h1>
            <p>Theo dõi mọi biến động số dư, đối soát dòng tiền và giải quyết khiếu nại</p>
          </div>

          <!-- Filters Section -->
          <div class="filters-section glass-card animate-fade-in-up" style="margin-bottom: var(--space-6); display: flex; gap: var(--space-4); align-items: center; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span class="material-icons-round" style="color:var(--text-muted)">filter_list</span>
              <span style="font-weight: 500;">Phân loại:</span>
            </div>
            
            <div class="filter-chips">
              <button class="chip" [class.active]="selectedType() === 'All'" (click)="setType('All')">Tất cả</button>
              <button class="chip" [class.active]="selectedType() === 'CashIn'" (click)="setType('CashIn')">Nạp tiền</button>
              <button class="chip" [class.active]="selectedType() === 'CashOut'" (click)="setType('CashOut')">Rút tiền</button>
              <button class="chip" [class.active]="selectedType() === 'Escrow'" (click)="setType('Escrow')">Ký quỹ & Hoàn trả</button>
              <button class="chip" [class.active]="selectedType() === 'Revenue'" (click)="setType('Revenue')">Doanh thu nền tảng</button>
            </div>
          </div>

          <!-- Transactions Table -->
          <div class="transactions-section glass-card animate-fade-in-up" style="animation-delay:0.1s">
            <h3 style="margin-bottom: var(--space-6); display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: var(--space-2);">
                <span class="material-icons-round" style="color:var(--primary-light)">receipt_long</span> Lịch sử Giao dịch
              </div>
              <span class="badge" style="background: rgba(var(--primary-rgb), 0.1); color: var(--primary);">
                Tổng cộng: {{ totalCount() | number }} giao dịch
              </span>
            </h3>
            
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 15%">Ngày GD</th>
                    <th style="width: 20%">Khách Hàng</th>
                    <th style="width: 15%">Loại Giao Dịch</th>
                    <th style="width: 35%">Mô tả</th>
                    <th style="text-align: right; width: 15%">Số Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  @if (isLoading()) {
                    <tr>
                      <td colspan="5">
                        <div class="skeleton skeleton-card" style="height: 60px;"></div>
                        <div class="skeleton skeleton-card" style="height: 60px; margin-top: 8px;"></div>
                        <div class="skeleton skeleton-card" style="height: 60px; margin-top: 8px;"></div>
                      </td>
                    </tr>
                  } @else if (filteredTransactions().length === 0) {
                    <tr>
                      <td colspan="5" class="text-center" style="padding: 3rem;">
                        <div class="empty-state">
                          <span class="material-icons-round" style="font-size: 3rem; color: var(--text-muted); opacity: 0.5;">receipt</span>
                          <p style="margin-top: 1rem; color: var(--text-muted)">Không có dữ liệu giao dịch</p>
                        </div>
                      </td>
                    </tr>
                  } @else {
                    @for (item of filteredTransactions(); track item.id) {
                      <tr class="animate-fade-in-up" [style.animation-delay]="$index * 0.05 + 's'">
                        <td>
                          <div class="font-medium">{{ item.createdAt + 'Z' | date:'dd/MM/yyyy' }}</div>
                          <div class="text-sm text-muted">{{ item.createdAt + 'Z' | date:'HH:mm:ss' }}</div>
                        </td>
                        <td>
                          <div class="font-medium">{{ item.fullName }}</div>
                          <div class="text-sm text-muted">{{ item.email }}</div>
                        </td>
                        <td>
                          <span class="badge" [style]="getTypeStyle(item.type)">
                            {{ getTypeName(item.type) }}
                          </span>
                        </td>
                        <td>
                          <div class="text-sm" style="line-height: 1.4;">{{ item.description || 'N/A' }}</div>
                          @if(item.relatedJobId) {
                            <div class="text-xs" style="color: var(--primary-light); margin-top: 4px;">Job ID: #{{item.relatedJobId}}</div>
                          }
                        </td>
                        <td class="font-medium" style="text-align: right;" [style.color]="item.amount > 0 ? 'var(--success)' : (item.amount < 0 ? 'var(--danger)' : 'inherit')">
                          {{ item.amount > 0 ? '+' : '' }}{{ item.amount | number }} ₫
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="pagination">
              <button class="btn btn-icon" [disabled]="currentPage() === 1" (click)="loadTransactions(currentPage() - 1)">
                <span class="material-icons-round">chevron_left</span>
              </button>
              <span class="page-info">Trang {{ currentPage() }} / {{ totalPages() }}</span>
              <button class="btn btn-icon" [disabled]="currentPage() >= totalPages()" (click)="loadTransactions(currentPage() + 1)">
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
    .glass-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      box-shadow: 0 8px 32px rgba(0,0,0,0.05);
    }
    
    .filter-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .chip {
      padding: 0.4rem 1rem;
      border-radius: 20px;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-primary);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .chip:hover { background: rgba(var(--primary-rgb), 0.05); border-color: var(--primary-light); }
    .chip.active { background: var(--primary); color: white; border-color: var(--primary); }

    .table-wrapper { overflow-x: auto; }
    .data-table {
      width: 100%; border-collapse: separate; border-spacing: 0;
      th, td { padding: var(--space-4); border-bottom: 1px solid var(--border-color); }
      th {
        text-align: left; color: var(--text-muted); font-weight: 600; text-transform: uppercase;
        font-size: 0.85rem; letter-spacing: 0.05em; background: var(--bg-card); position: sticky; top: 0; z-index: 5;
        box-shadow: 0 1px 0 var(--border-light);
      }
      tbody tr { transition: all 0.2s ease; &:hover { background: rgba(var(--text-color-rgb), 0.02); } }
    }
    .badge {
      display: inline-flex; align-items: center; padding: 0.25rem 0.75rem;
      border-radius: var(--radius-full); font-size: 0.85rem; font-weight: 600;
    }
    .text-sm { font-size: 0.875rem; }
    .text-xs { font-size: 0.75rem; }
    .text-muted { color: var(--text-muted); }
    .font-medium { font-weight: 500; }
    
    .pagination {
      display: flex; align-items: center; justify-content: center; gap: var(--space-4);
      margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--border-color);
    }
    .page-info { font-weight: 500; color: var(--text-muted); }
    
    @media (max-width: 768px) {
      .dashboard-header h1 { font-size: 2rem; }
    }
  `]
})
export class AdminLedgerComponent implements OnInit {
  auth = inject(AuthService);
  http = inject(HttpClient);
  toast = inject(ToastService);
  searchService = inject(AdminSearchService);
  
  transactions = signal<any[]>([]);
  isLoading = signal(false);
  currentPage = signal(1);
  pageSize = 15;
  totalCount = signal(0);
  selectedType = signal('All');

  filteredTransactions = computed(() => {
    let list = this.transactions();
    const query = this.searchService.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter((item: any) => 
        (item.fullName || '').toLowerCase().includes(query) ||
        (item.email || '').toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query)
      );
    }
    return list;
  });

  ngOnInit() {
    this.loadTransactions(1);
  }

  setType(type: string) {
    this.selectedType.set(type);
    this.loadTransactions(1);
  }

  getTypeName(type: number): string {
    const map: Record<number, string> = {
      0: 'Nạp Tiền',
      1: 'Phí Đăng Tin',
      2: 'Giữ Ký Quỹ (Escrow)',
      3: 'Trả Lương',
      4: 'Hoa Hồng Nền Tảng',
      5: 'Hoàn Tiền',
      6: 'Rút Tiền',
      7: 'Mua Gói'
    };
    return map[type] || 'Khác';
  }

  getTypeStyle(type: number): string {
    // Colors matching financial meanings
    if (type === 0) return 'background: rgba(16, 185, 129, 0.1); color: #10b981;'; // Deposit (Green)
    if (type === 6) return 'background: rgba(245, 158, 11, 0.1); color: #f59e0b;'; // Withdrawal (Orange)
    if (type === 2) return 'background: rgba(99, 102, 241, 0.1); color: #6366f1;'; // EscrowHold (Indigo)
    if (type === 3) return 'background: rgba(139, 92, 246, 0.1); color: #8b5cf6;'; // EscrowRelease (Purple)
    if (type === 5) return 'background: rgba(14, 165, 233, 0.1); color: #0ea5e9;'; // Refund (Sky)
    if ([1, 4, 7].includes(type)) return 'background: rgba(236, 72, 153, 0.1); color: #ec4899;'; // Revenue (Pink)
    return 'background: rgba(107, 114, 128, 0.1); color: #6b7280;'; // Default (Gray)
  }

  loadTransactions(page: number) {
    this.isLoading.set(true);
    this.currentPage.set(page);

    this.http.get<any>(`${API_BASE_URL}/admin/transactions?page=${page}&pageSize=${this.pageSize}&type=${this.selectedType()}`).subscribe({
      next: (res) => {
        this.transactions.set(res.items);
        this.totalCount.set(res.totalCount);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load transactions', err);
        this.toast.error('Lỗi khi tải dữ liệu sổ cái');
        this.isLoading.set(false);
      }
    });
  }

  totalPages = computed(() => {
    return Math.ceil(this.totalCount() / this.pageSize) || 1;
  });
}
