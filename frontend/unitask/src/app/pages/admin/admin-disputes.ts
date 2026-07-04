import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { JobService } from '../../services/job.service';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';
import { Job } from '../../models/job.model';

interface DisputeItem {
  id: number;
  title: string;
  budget: number;
  commission: number;
  employerName: string;
  employerEmail: string;
  studentName: string;
  studentEmail: string;
  disputeReason: string;
  employerEvidenceText: string;
  employerEvidenceUrl?: string;
  studentEvidenceText?: string;
  studentEvidenceUrl?: string;
  disputedDate: string;
}

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [RouterLink, FormsModule],
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
            <a routerLink="/admin/withdrawals" class="admin-tab">
              <span class="material-icons-round">account_balance_wallet</span> Duyệt rút tiền
            </a>
            <a routerLink="/admin/disputes" class="admin-tab active">
              <span class="material-icons-round">gavel</span> Giải quyết tranh chấp
            </a>
            <a routerLink="/admin/revenue" class="admin-tab">
              <span class="material-icons-round">receipt_long</span> Doanh thu & Dòng tiền
            </a>
          </div>

          <div class="dashboard-header animate-fade-in-up">
            <h1>Quản lý <span class="gradient-text">Tranh chấp Công việc</span></h1>
            <p>Phân xử tranh chấp nghiệm thu và bảo vệ ký quỹ (Escrow) UniTask</p>
          </div>

          <!-- Disputes List -->
          <div class="main-content-section glass-card animate-fade-in-up" style="animation-delay:0.1s">
            <div class="filter-bar d-flex justify-between items-center mb-6" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
              <h3 style="font-size:1.15rem; font-weight:700">Yêu cầu cần xử lý ({{ totalDisputesCount() }})</h3>
              <button class="btn btn-secondary btn-sm" (click)="loadDisputes(1)" style="display:flex; align-items:center; gap:4px">
                <span class="material-icons-round">sync</span> Làm mới
              </button>
            </div>

            @if (disputes().length === 0) {
              <div class="empty-state text-center p-12" style="text-align:center; padding:48px 0; color:var(--text-muted)">
                <span class="material-icons-round" style="font-size:64px; opacity:0.5; margin-bottom:16px; display:block">gavel</span>
                <p>Hiện không có tranh chấp công việc nào cần giải quyết. Hệ thống đang hoạt động ổn định!</p>
              </div>
            } @else {
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Công việc (Job)</th>
                      <th>Lương ký quỹ</th>
                      <th>Nhà tuyển dụng</th>
                      <th>Sinh viên thực hiện</th>
                      <th>Ngày tranh chấp</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of disputes(); track d.id) {
                      <tr>
                        <td>
                          <div class="job-title-col">
                            <strong>{{ d.title }}</strong>
                            <span class="text-caption">Mã việc: #{{ d.id }}</span>
                          </div>
                        </td>
                        <td>
                          <strong style="color:var(--warning)">{{ formatCurrency(d.budget) }}</strong>
                          <span class="text-caption" style="display:block;font-size:0.75rem">Phí nền tảng: {{ formatCurrency(d.commission) }}</span>
                        </td>
                        <td>
                          <div class="user-meta-col">
                            <strong>{{ d.employerName }}</strong>
                            <span class="text-caption">{{ d.employerEmail }}</span>
                          </div>
                        </td>
                        <td>
                          <div class="user-meta-col">
                            <strong>{{ d.studentName || 'N/A' }}</strong>
                            <span class="text-caption">{{ d.studentEmail }}</span>
                          </div>
                        </td>
                        <td>
                          <span style="font-size:0.85rem; color:var(--text-muted)">{{ d.disputedDate }}</span>
                        </td>
                        <td>
                          <button class="btn btn-primary btn-sm" (click)="selectedDispute.set(d)">
                            <span class="material-icons-round" style="font-size:16px">balance</span> Xem bằng chứng
                          </button>
                        </td>
                      </tr>
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
            }
          </div>
        }
      </div>
    </section>

    <!-- Detail & Evidence Modal -->
    @if (selectedDispute()) {
      <div class="modal-overlay animate-fade-in" (click)="selectedDispute.set(null)">
        <div class="modal-content glass-card p-6" (click)="$event.stopPropagation()" style="width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header d-flex justify-between items-center mb-6" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:1px solid var(--border-light); padding-bottom:12px">
            <h3 style="font-size:1.35rem; font-weight:800; display:flex; align-items:center; gap:8px">
              <span class="material-icons-round" style="color:var(--primary-light)">gavel</span> Chi tiết tranh chấp #{{ selectedDispute()?.id }}
            </h3>
            <button class="btn btn-secondary icon-btn" (click)="selectedDispute.set(null)">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <div style="margin-bottom:20px; font-size:0.95rem">
            <strong style="font-size:1.1rem; display:block; margin-bottom:4px">{{ selectedDispute()?.title }}</strong>
            <span style="color:var(--text-secondary)">Lương ký quỹ tạm giữ: <strong style="color:var(--warning)">{{ formatCurrency(selectedDispute()?.budget || 0) }}</strong> (Phí hệ thống: {{ formatCurrency(selectedDispute()?.commission || 0) }})</span>
          </div>

          <div class="dispute-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px">
            <!-- Employer Evidence -->
            <div class="evidence-box p-4" style="background:rgba(239,68,68,0.03); border:1px solid rgba(239,68,68,0.15); border-radius:8px; padding:16px">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; border-bottom:1px solid rgba(239,68,68,0.1); padding-bottom:8px">
                <span class="material-icons-round" style="color:#EF4444">business</span>
                <strong style="color:#EF4444">Nhà tuyển dụng</strong>
              </div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px">Đại diện: {{ selectedDispute()?.employerName }}</p>
              <div class="evidence-content" style="font-size:0.9rem; color:var(--text-secondary); line-height:1.6">
                <p><strong>Lý do từ chối:</strong> "{{ selectedDispute()?.disputeReason }}"</p>
                <p style="margin-top:8px"><strong>Mô tả bằng chứng:</strong> {{ selectedDispute()?.employerEvidenceText }}</p>
                @if (selectedDispute()?.employerEvidenceUrl) {
                  <div style="margin-top:12px">
                    <a [href]="selectedDispute()?.employerEvidenceUrl" target="_blank" style="color:var(--primary-light); font-size:0.85rem; font-weight:600; text-decoration:underline">Xem ảnh/tài liệu đính kèm</a>
                  </div>
                }
              </div>
            </div>

            <!-- Student Evidence -->
            <div class="evidence-box p-4" style="background:rgba(16,185,129,0.03); border:1px solid rgba(16,185,129,0.15); border-radius:8px; padding:16px">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; border-bottom:1px solid rgba(16,185,129,0.1); padding-bottom:8px">
                <span class="material-icons-round" style="color:#10B981">school</span>
                <strong style="color:#10B981">Sinh viên thực hiện</strong>
              </div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px">Họ tên: {{ selectedDispute()?.studentName }}</p>
              <div class="evidence-content" style="font-size:0.9rem; color:var(--text-secondary); line-height:1.6">
                @if (selectedDispute()?.studentEvidenceText) {
                  <p><strong>Mô tả bằng chứng:</strong> {{ selectedDispute()?.studentEvidenceText }}</p>
                  @if (selectedDispute()?.studentEvidenceUrl) {
                    <div style="margin-top:12px">
                      <a [href]="selectedDispute()?.studentEvidenceUrl" target="_blank" style="color:var(--primary-light); font-size:0.85rem; font-weight:600; text-decoration:underline">Xem ảnh/tài liệu đính kèm</a>
                    </div>
                  }
                } @else {
                  <p style="font-style:italic; color:var(--text-muted)">Sinh viên chưa nộp bằng chứng chứng minh hoàn thành công việc.</p>
                }
              </div>
            </div>
          </div>

          <div class="resolve-warning" style="background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.2); border-radius:8px; padding:12px 16px; margin-bottom:24px; font-size:0.85rem; color:var(--text-secondary); display:flex; gap:8px; align-items:flex-start">
            <span class="material-icons-round" style="color:#F59E0B; font-size:20px; flex-shrink:0">warning</span>
            <div>
              <strong>Lưu ý quyết định của Admin:</strong>
              <ul style="margin:4px 0 0 16px; padding:0; list-style-type:disc">
                <li>Nếu duyệt <strong>Sinh viên thắng</strong>: Chuyển toàn bộ tiền lương ký quỹ cho sinh viên. Nhà tuyển dụng nhận thêm +1 cảnh cáo blacklist.</li>
                <li>Nếu duyệt <strong>Nhà tuyển dụng thắng</strong>: Hoàn tiền lương ký quỹ cho nhà tuyển dụng (giữ lại phí hoa hồng). Sinh viên nhận thêm +1 cảnh cáo blacklist.</li>
                <li>Nếu bên nào vượt quá 3 lần blacklist sẽ bị hệ thống tự động khóa quyền đăng bài/ứng tuyển vĩnh viễn.</li>
              </ul>
            </div>
          </div>

          <div class="modal-actions d-flex justify-between gap-4" style="display:flex; justify-content:space-between; gap:16px">
            <button class="btn btn-secondary" style="flex:1" (click)="selectedDispute.set(null)">Đóng lại</button>
            <div style="display:flex; gap:12px; flex:2">
              <button class="btn btn-danger" style="flex:1; background:#EF4444; border-color:#EF4444; color:white" (click)="resolve(selectedDispute()!.id, 'Employer')">
                <span class="material-icons-round" style="font-size:16px; vertical-align:middle; margin-right:4px">business</span> NTD thắng (Hoàn tiền)
              </button>
              <button class="btn btn-success" style="flex:1; background:#10B981; border-color:#10B981; color:white" (click)="resolve(selectedDispute()!.id, 'Student')">
                <span class="material-icons-round" style="font-size:16px; vertical-align:middle; margin-right:4px">school</span> Sinh viên thắng (Giải ngân)
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (showConfirmResolveModal()) {
      <div class="modal-overlay animate-fade-in" style="z-index:1100">
        <div class="modal-content glass-card p-6" style="width: 100%; max-width: 480px; text-align: center;">
          <span class="material-icons-round text-warning" style="font-size:64px; margin-bottom:16px; color:#F59E0B">warning</span>
          <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Xác nhận phân xử tranh chấp</h3>
          <p style="color:var(--text-secondary); margin-bottom:24px; font-size: 0.95rem;">
            Bạn chắc chắn muốn phân quyết: <strong>{{ resolveWinner() === 'Student' ? 'Sinh viên thắng (Giải ngân)' : 'Nhà tuyển dụng thắng (Hoàn tiền)' }}</strong>? Quyết định này không thể hoàn tác.
          </p>
          <div style="display:flex; gap:12px; justify-content:center">
            <button type="button" class="btn btn-secondary" style="flex:1" (click)="showConfirmResolveModal.set(false)">Hủy</button>
            <button type="button" class="btn btn-primary" style="flex:1; background:var(--primary-light)" (click)="executeResolve()">
              Xác nhận
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

    .main-content-section {
      padding: var(--space-6);
    }

    /* Table styles */
    .table-wrapper {
      overflow-x: auto;
    }

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
      vertical-align: middle;
    }

    .data-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .data-table tr:last-child td { border-bottom: none; }

    .job-title-col strong, .user-meta-col strong {
      display: block;
      color: var(--text-primary);
    }

    .text-caption {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .user-meta-col {
      display: flex;
      flex-direction: column;
    }

    /* Modal styles */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--bg-dashboard);
      border-radius: var(--radius-xl);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    .btn-success:hover {
      background: #059669 !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .btn-danger:hover {
      background: #DC2626 !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    @media (max-width: 768px) {
      .dispute-grid { grid-template-columns: 1fr !important; }
      .modal-actions { flex-direction: column; }
      .modal-actions div { flex-direction: column; width: 100%; }
    }
  `]
})
export class AdminDisputesComponent implements OnInit {
  auth = inject(AuthService);
  private jobService = inject(JobService);
  private toast = inject(ToastService);

  disputes = signal<DisputeItem[]>([]);
  selectedDispute = signal<DisputeItem | null>(null);

  currentPage = signal<number>(1);
  pageSize = 10;
  hasMore = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  totalDisputesCount = signal<number>(0);

  showConfirmResolveModal = signal(false);
  resolveWinner = signal<'Student' | 'Employer' | null>(null);
  pendingResolveJobId = signal<number | null>(null);

  ngOnInit() {
    if (this.auth.isAdmin()) {
      this.loadDisputes();
    }
  }

  loadDisputes(page: number = 1) {
    this.isLoading.set(true);
    this.jobService.getDisputes(page, this.pageSize).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const dataItems = Array.isArray(res) ? res : (res?.items || []);
        if (page === 1) {
          this.disputes.set(dataItems);
        } else {
          this.disputes.update(current => [...current, ...dataItems]);
        }
        this.currentPage.set(page);
        this.hasMore.set(Array.isArray(res) ? false : (res?.hasMore || false));
        this.totalDisputesCount.set(Array.isArray(res) ? dataItems.length : (res?.totalCount || 0));
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Không thể tải danh sách tranh chấp từ máy chủ.');
      }
    });
  }

  loadMore() {
    this.loadDisputes(this.currentPage() + 1);
  }

  resolve(jobId: number, winner: 'Student' | 'Employer') {
    this.pendingResolveJobId.set(jobId);
    this.resolveWinner.set(winner);
    this.showConfirmResolveModal.set(true);
  }

  executeResolve() {
    const jobId = this.pendingResolveJobId();
    const winner = this.resolveWinner();
    if (!jobId || !winner) return;

    this.showConfirmResolveModal.set(false);
    this.jobService.resolveDispute(jobId, winner).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(res.message || 'Phân xử tranh chấp thành công.');
          this.selectedDispute.set(null);
          this.loadDisputes(1);
        } else {
          this.toast.error(res.message || 'Lỗi khi phân xử tranh chấp.');
        }
      },
      error: () => this.toast.error('Gặp lỗi kết nối máy chủ khi xử lý.')
    });
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('vi-VN') + 'đ';
  }
}
