import { Component, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-page-content">
          <div class="dashboard-header animate-fade-in-up" style="animation-delay:0.1s">
            <div class="header-left">
              <h1>Quản lý <span class="gradient-text">Người dùng & eKYC</span></h1>
              <p>Phê duyệt hồ sơ và quản lý tài khoản</p>
            </div>
            <div class="header-actions">
              <div class="filter-group">
                <span class="material-icons-round">filter_list</span>
                <select class="form-select status-select" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
                  <option value="all">Tất cả trạng thái eKYC</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="verified">Đã xác thực</option>
                  <option value="none">Chưa xác thực</option>
                  <option value="rejected">Bị từ chối</option>
                </select>
              </div>
              <div class="filter-group">
                <span class="material-icons-round">category</span>
                <select class="form-select role-select" [ngModel]="roleFilter()" (ngModelChange)="roleFilter.set($event)">
                  <option value="all">Tất cả vai trò</option>
                  <option value="student">Sinh viên</option>
                  <option value="employer">Nhà tuyển dụng</option>
                </select>
              </div>
            </div>
          </div>

          <div class="users-section glass-card animate-fade-in-up" style="animation-delay:0.15s">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Liên hệ</th>
                    <th>Trạng thái eKYC</th>
                    <th>Ngày tham gia</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of filteredUsers(); track user.id) {
                    <tr>
                      <td>
                        <div class="user-info">
                          <div class="avatar-sm">{{ user.avatar }}</div>
                          <div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                              <strong style="color: var(--text-primary);">{{ user.fullName }}</strong>
                              @if (user.isFlagged) {
                                <span class="material-icons-round" style="color: #EF4444; font-size: 18px; cursor: help;" [title]="'Tài khoản bị cảnh cáo: ' + user.flagReason">flag</span>
                              }
                            </div>
                            <span class="text-caption">{{ user.role === 'student' ? user.university : user.companyName }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="role-badge" [class]="user.role">
                          {{ user.role === 'student' ? 'Sinh viên' : 'Nhà tuyển dụng' }}
                        </span>
                        @if (user.role === 'student') {
                          <div class="text-caption" style="margin-top: 4px; display: flex; align-items: center; gap: 2px;">
                            <span class="material-icons-round" style="font-size: 14px; color: var(--warning)">verified_user</span>
                            Điểm: <strong>{{ user.reliabilityScore ?? 100 }}</strong>
                          </div>
                        }
                      </td>
                      <td>
                        <div class="contact-info">
                          <span>{{ user.email }}</span>
                          <span class="text-caption">{{ user.phone }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="status-badge" [class]="'status-' + user.ekycStatus">
                          @if (user.ekycStatus === 'verified') {
                            <span class="material-icons-round">check_circle</span> Đã duyệt
                          } @else if (user.ekycStatus === 'pending') {
                            <span class="material-icons-round">hourglass_top</span> Chờ duyệt
                          } @else if (user.ekycStatus === 'rejected') {
                            <span class="material-icons-round">cancel</span> Bị từ chối
                          } @else {
                            <span class="material-icons-round">gpp_maybe</span> Chưa XT
                          }
                        </span>
                      </td>
                      <td><span class="text-muted">{{ user.createdAt }}</span></td>
                      <td>
                        @if (user.ekycStatus !== 'verified') {
                          <button class="btn btn-sm btn-primary" (click)="forceVerify(user.id)" style="font-size: 11px; padding: 4px 8px; margin-right: 4px;">
                            Ép XT (Test)
                          </button>
                        }
                        <button class="btn btn-sm btn-secondary" (click)="openEditModal(user)" style="font-size: 11px; padding: 4px 8px;" title="Sửa thông tin">
                          <span class="material-icons-round" style="font-size: 14px;">edit</span>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="empty-state">
                        <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">search_off</span>
                        <p>Không tìm thấy người dùng phù hợp với bộ lọc.</p>
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
          </div>

          <!-- Edit User Modal -->
          @if (isEditModalOpen()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content animate-scale-in" style="max-width: 450px;">
                <div class="modal-header">
                  <h2>Sửa thông tin Người dùng</h2>
                  <button class="icon-btn" (click)="closeEditModal()"><span class="material-icons-round">close</span></button>
                </div>
                <div class="modal-body">
                  <p style="margin-bottom: var(--space-4); color: var(--text-secondary);">
                    Bạn đang sửa thông tin cho: <strong style="color: var(--text-primary);">{{ selectedUser()?.fullName }}</strong>
                  </p>
                  <div class="form-group">
                    <label>Địa chỉ Email mới</label>
                    <input type="email" class="form-control" [ngModel]="editingEmail()" (ngModelChange)="editingEmail.set($event)" placeholder="Nhập email mới..." />
                    <small class="text-caption" style="display: block; margin-top: var(--space-2); color: var(--warning);">Lưu ý: Username đăng nhập của User cũng sẽ bị thay đổi theo email này.</small>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn btn-secondary" (click)="closeEditModal()">Hủy</button>
                  <button class="btn btn-primary" (click)="updateEmail()" [disabled]="isUpdating()">
                    @if (isUpdating()) {
                      <span class="material-icons-round spinner-icon">sync</span>
                    }
                    Lưu thay đổi
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
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: var(--space-6);
    }

    .header-left h1 {
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

    .header-left p { color: var(--text-secondary); }

    .header-actions {
      display: flex;
      gap: var(--space-4);
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--bg-secondary);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
    }

    .filter-group .material-icons-round {
      font-size: 18px;
      color: var(--text-muted);
      margin-left: var(--space-2);
    }

    .form-select {
      background: transparent;
      border: none;
      padding: var(--space-2);
      padding-right: var(--space-6);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      width: auto;
      min-width: 150px;
    }

    .form-select:focus {
      outline: none;
      box-shadow: none;
      border-color: transparent;
    }

    .table-wrapper {
      overflow-x: auto;
      border-radius: var(--radius-lg);
    }

    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 800px;
    }

    .data-table th {
      text-align: left;
      padding: var(--space-4) var(--space-5);
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-light);
      background: rgba(0,0,0,0.2);
    }

    .data-table td {
      padding: var(--space-3) var(--space-5);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-light);
      vertical-align: middle;
    }

    .data-table tr:hover td {
      background: rgba(255,255,255,0.02);
    }

    .data-table tr:last-child td { border-bottom: none; }

    .user-info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .avatar-sm {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: white;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: var(--space-6);
    }

    .header-left h1 {
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

    .header-left p { color: var(--text-secondary); }

    .header-actions {
      display: flex;
      gap: var(--space-4);
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--bg-secondary);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
    }

    .filter-group .material-icons-round {
      font-size: 18px;
      color: var(--text-muted);
      margin-left: var(--space-2);
    }

    .form-select {
      background: transparent;
      border: none;
      padding: var(--space-2);
      padding-right: var(--space-6);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      width: auto;
      min-width: 150px;
    }

    .form-select:focus {
      outline: none;
      box-shadow: none;
      border-color: transparent;
    }

    .table-wrapper {
      overflow-x: auto;
      border-radius: var(--radius-lg);
    }

    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 800px;
    }

    .data-table th {
      text-align: left;
      padding: var(--space-4) var(--space-5);
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-light);
      background: rgba(0,0,0,0.2);
    }

    .data-table td {
      padding: var(--space-3) var(--space-5);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-light);
      vertical-align: middle;
    }

    .data-table tr:hover td {
      background: rgba(255,255,255,0.02);
    }

    .data-table tr:last-child td { border-bottom: none; }

    .user-info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .avatar-sm {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .user-info strong {
      display: block;
      color: var(--text-primary);
      font-weight: 600;
      margin-bottom: 2px;
    }

    .text-caption {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .role-badge {
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 600;
      display: inline-block;
    }

    .role-badge.student {
      background: rgba(59, 130, 246, 0.1);
      color: #3B82F6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .role-badge.employer {
      background: rgba(16, 185, 129, 0.1);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 600;
    }

    .status-badge .material-icons-round { font-size: 14px; }

    .status-verified {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
    }

    .status-pending {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning);
    }

    .status-rejected {
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
    }

    .status-none {
      background: rgba(100, 116, 139, 0.1);
      color: var(--text-muted);
    }

    .empty-state {
      text-align: center;
      padding: var(--space-10);
    }

    .empty-state p { margin-top: var(--space-3); color: var(--text-secondary); }
    .text-muted { color: var(--text-muted); }

    @media (max-width: 900px) {
      .dashboard-header { flex-direction: column; align-items: flex-start; gap: var(--space-4); }
      .header-actions { flex-wrap: wrap; }
      .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .data-table { min-width: 600px; }
    }

    @media (max-width: 600px) {
      .filter-bar { flex-direction: column; }
      .filter-bar select, .filter-bar .btn { width: 100%; }
    }
  `]
})
export class AdminUsersComponent {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  
  users = signal<any[]>([]);
  statusFilter = signal<string>('all');
  roleFilter = signal<string>('all');

  currentPage = signal<number>(1);
  pageSize = 10;
  hasMore = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  
  // Edit Modal State
  isEditModalOpen = signal<boolean>(false);
  selectedUser = signal<any>(null);
  editingEmail = signal<string>('');
  isUpdating = signal<boolean>(false);

 
  filteredUsers = computed(() => {
    let result = this.users();
    
    if (this.statusFilter() !== 'all') {
      result = result.filter((u: any) => {
        const status = (u.ekycStatus || 'none').toLowerCase();
        return status === this.statusFilter();
      });
    }
    
    if (this.roleFilter() !== 'all') {
      result = result.filter((u: any) => (u.role || '').toLowerCase() === this.roleFilter());
    }

    return result;
  });

  constructor() {
    this.loadUsers();
  }

  loadUsers(page: number = 1) {
    this.isLoading.set(true);
    this.http.get<any>(`${API_BASE_URL}/admin/users?page=${page}&pageSize=${this.pageSize}`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const newUsers = Array.isArray(res) ? res : (res?.items || []);
        if (page === 1) {
          this.users.set(newUsers);
        } else {
          this.users.update(current => [...current, ...newUsers]);
        }
        this.currentPage.set(page);
        this.hasMore.set(Array.isArray(res) ? false : (res?.hasMore || false));
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to load users:', err);
        this.toast.error('Không thể tải danh sách người dùng.');
      }
    });
  }

  loadMore() {
    this.loadUsers(this.currentPage() + 1);
  }

  forceVerify(userId: string) {
    if (confirm('Bạn có chắc muốn ép xác thực người dùng này không?')) {
      this.http.post<any>(`${API_BASE_URL}/admin/users/${userId}/force-verify`, {}).subscribe({
        next: (res) => {
          this.toast.success(res.message);
          this.loadUsers(1);
        },
        error: (err) => {
          this.toast.error('Không thể ép xác thực.');
        }
      });
    }
  }

  openEditModal(user: any) {
    this.selectedUser.set(user);
    this.editingEmail.set(user.email);
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
    this.selectedUser.set(null);
    this.editingEmail.set('');
  }

  updateEmail() {
    const user = this.selectedUser();
    const newEmail = this.editingEmail().trim();

    if (!user || !newEmail) {
      this.toast.error('Vui lòng nhập địa chỉ email.');
      return;
    }

    if (newEmail === user.email) {
      this.closeEditModal();
      return;
    }

    this.isUpdating.set(true);
    this.http.put<any>(`${API_BASE_URL}/admin/users/${user.id}/email`, { email: newEmail }).subscribe({
      next: (res) => {
        this.isUpdating.set(false);
        this.toast.success(res.message);
        this.closeEditModal();
        this.loadUsers(this.currentPage()); // Reload current page
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.toast.error(err.error?.message || 'Không thể cập nhật email.');
      }
    });
  }
}
