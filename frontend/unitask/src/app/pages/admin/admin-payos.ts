import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';

@Component({
  selector: 'app-admin-payos',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
    <div class="admin-page-content">
          <div class="dashboard-header animate-fade-in-up">
            <h1>Thống Kê <span class="gradient-text">Giao Dịch Nạp Tiền PayOS</span></h1>
            <p>Danh sách các tài khoản ngân hàng đã chuyển tiền vào hệ thống</p>
          </div>

          <!-- Transactions Table -->
          <div class="transactions-section glass-card animate-fade-in-up" style="animation-delay:0.1s">
            <h3 style="margin-bottom: var(--space-6); display: flex; align-items: center; gap: var(--space-2);">
              <span class="material-icons-round" style="color:var(--primary-light)">list_alt</span> Dữ liệu PayOS Webhook
            </h3>
            
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ngày GD</th>
                    <th>Tài khoản Nạp (Hệ thống)</th>
                    <th>Ngân Hàng Chuyển</th>
                    <th>Chủ Tài Khoản</th>
                    <th>Số Tài Khoản</th>
                    <th style="text-align: right;">Số Tiền Nhận</th>
                  </tr>
                </thead>
                <tbody>
                  @if (isLoading()) {
                    <tr>
                      <td colspan="6" class="text-center" style="padding: 3rem;">
                        <span class="material-icons-round spin" style="font-size: 2rem; color: var(--primary)">autorenew</span>
                        <p style="margin-top: 1rem; color: var(--text-muted)">Đang tải dữ liệu PayOS...</p>
                      </td>
                    </tr>
                  } @else if (deposits().length === 0) {
                    <tr>
                      <td colspan="6" class="text-center" style="padding: 3rem;">
                        <div class="empty-state">
                          <span class="material-icons-round" style="font-size: 3rem; color: var(--text-muted); opacity: 0.5;">money_off</span>
                          <p style="margin-top: 1rem; color: var(--text-muted)">Chưa có dữ liệu nạp tiền từ PayOS</p>
                        </div>
                      </td>
                    </tr>
                  } @else {
                    @for (item of deposits(); track item.id) {
                      <tr class="animate-fade-in-up" [style.animation-delay]="$index * 0.05 + 's'">
                        <td>
                          <div class="font-medium">{{ item.createdAt | date:'dd/MM/yyyy' }}</div>
                          <div class="text-sm text-muted">{{ item.createdAt | date:'HH:mm:ss' }}</div>
                        </td>
                        <td>
                          <div class="font-medium">{{ item.userFullName }}</div>
                          <div class="text-sm text-muted">{{ item.userEmail }}</div>
                        </td>
                        <td>
                          <span class="badge" style="background: rgba(var(--primary-rgb), 0.1); color: var(--primary)">
                            {{ item.counterAccountBankName || 'N/A' }}
                          </span>
                        </td>
                        <td class="font-medium">{{ item.counterAccountName || 'N/A' }}</td>
                        <td class="text-muted">{{ item.counterAccountNumber || 'N/A' }}</td>
                        <td class="font-medium" style="text-align: right; color: var(--success)">
                          +{{ item.amount | number }} ₫
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="pagination">
              <button class="btn btn-icon" [disabled]="currentPage() === 1" (click)="loadDeposits(currentPage() - 1)">
                <span class="material-icons-round">chevron_left</span>
              </button>
              <span class="page-info">Trang {{ currentPage() }} / {{ totalPages() }}</span>
              <button class="btn btn-icon" [disabled]="currentPage() >= totalPages()" (click)="loadDeposits(currentPage() + 1)">
                <span class="material-icons-round">chevron_right</span>
              </button>
            </div>
          </div>
    </div>
  `,
  styles: [`
    .admin-page-content {
      width: 100%;
    }

    .dashboard-header {
      margin-bottom: var(--space-8);
      text-align: center;
      
      h1 {
        font-size: 2.5rem;
        margin-bottom: var(--space-2);
      }
      p {
        color: var(--text-muted);
        font-size: 1.1rem;
      }
    }
    .glass-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      box-shadow: 0 8px 32px rgba(0,0,0,0.05);
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      
      th, td {
        padding: var(--space-4);
        border-bottom: 1px solid var(--border-color);
      }
      th {
        text-align: left;
        color: var(--text-muted);
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.85rem;
        letter-spacing: 0.05em;
        background: rgba(var(--text-color-rgb), 0.02);
      }
      tbody tr {
        transition: all 0.2s ease;
        &:hover {
          background: rgba(var(--text-color-rgb), 0.02);
        }
      }
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.85rem;
      font-weight: 600;
    }
    .text-sm { font-size: 0.875rem; }
    .text-muted { color: var(--text-muted); }
    .font-medium { font-weight: 500; }
    
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-4);
      margin-top: var(--space-6);
      padding-top: var(--space-6);
      border-top: 1px solid var(--border-color);
    }
    .page-info {
      font-weight: 500;
      color: var(--text-muted);
    }
    
    @media (max-width: 768px) {
      .dashboard-header h1 { font-size: 2rem; }
    }
  `]
})
export class AdminPayosComponent implements OnInit {
  auth = inject(AuthService);
  http = inject(HttpClient);
  toast = inject(ToastService);
  
  deposits = signal<any[]>([]);
  isLoading = signal(false);
  currentPage = signal(1);
  pageSize = 10;
  totalCount = signal(0);

  ngOnInit() {
    this.loadDeposits(1);
  }

  loadDeposits(page: number) {
    this.isLoading.set(true);
    this.currentPage.set(page);

    this.http.get<any>(`${API_BASE_URL}/admin/payos-deposits?page=${page}&pageSize=${this.pageSize}`).subscribe({
      next: (res) => {
        this.deposits.set(res.items);
        this.totalCount.set(res.totalCount);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load PayOS deposits', err);
        this.toast.error('Lỗi khi tải dữ liệu PayOS');
        this.isLoading.set(false);
      }
    });
  }

  totalPages = computed(() => {
    return Math.ceil(this.totalCount() / this.pageSize) || 1;
  });
}
