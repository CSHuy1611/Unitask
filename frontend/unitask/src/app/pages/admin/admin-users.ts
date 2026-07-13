import { Component, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { API_BASE_URL } from '../../config/api.config';
import { AdminSearchService } from '../../services/admin-search.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
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
                <select class="form-select status-select" [ngModel]="statusFilter()" (ngModelChange)="onStatusChange($event)">
                  <option value="all">Tất cả trạng thái eKYC</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="verified">Đã xác thực</option>
                  <option value="none">Chưa xác thực</option>
                  <option value="rejected">Bị từ chối</option>
                </select>
              </div>
              <div class="filter-group">
                <span class="material-icons-round">category</span>
                <select class="form-select role-select" [ngModel]="roleFilter()" (ngModelChange)="onRoleChange($event)">
                  <option value="all">Tất cả vai trò</option>
                  <option value="student">Sinh viên</option>
                  <option value="employer">Hộ kinh doanh</option>
                </select>
              </div>
            </div>
          </div>

          <div style="margin-bottom: var(--space-4); display: flex; justify-content: flex-end;">
             <span class="badge" style="background: rgba(var(--primary-rgb), 0.1); color: var(--primary); font-size: 0.9rem; padding: 6px 12px;">
                Tổng cộng: {{ totalCount() | number }} người dùng
             </span>
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
                  @if (isLoading() && users().length === 0) {
                    <tr>
                      <td colspan="6">
                        <div class="skeleton skeleton-card"></div>
                      </td>
                    </tr>
                  } @else {
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
                          <span class="role-badge" [class]="user.role === 'student' ? 'student' : 'household'">
                            {{ user.role === 'student' ? 'Sinh viên' : 'Hộ kinh doanh' }}
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
                          @if (user.isBanned) {
                            <span class="badge" style="background: rgba(239,68,68,0.1); color: #ef4444;">
                              <span class="material-icons-round">block</span> Bị Khóa
                            </span>
                          } @else {
                            <span class="badge" [class]="'badge-' + (user.ekycStatus === 'verified' ? 'success' : (user.ekycStatus === 'pending' ? 'warning' : 'neutral'))">
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
                          }
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
                          <div class="action-wrapper" [class.open]="openDropdownId() === user.id">
                            <button class="action-btn-icon" (click)="toggleDropdown(user.id, $event)">
                              <span class="material-icons-round">more_vert</span>
                            </button>
                            <div class="action-menu">
                              @if (user.ekycStatus !== 'verified') {
                                <button class="action-item" (click)="forceVerify(user.id)">
                                  <span class="material-icons-round">check_circle</span> Xác thực ngay
                                </button>
                              }
                              <button class="action-item" (click)="openEditModal(user)">
                                <span class="material-icons-round">edit</span> Sửa email
                              </button>
                              <div class="action-divider"></div>
                              <button class="action-item" (click)="toggleBanUser(user)">
                                <span class="material-icons-round">{{ user.isBanned ? 'lock_open' : 'block' }}</span> {{ user.isBanned ? 'Mở Khóa' : 'Khóa tài khoản' }}
                              </button>
                              <button class="action-item text-danger" (click)="confirmDeleteUser(user)">
                                <span class="material-icons-round">delete_forever</span> Xóa tài khoản
                              </button>
                            </div>
                          </div>
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
            <div class="modal-backdrop">
              <div class="modal-panel">
                <div class="modal-header">
                  <h3>Sửa thông tin Người dùng</h3>
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

          <!-- Confirm Verify Modal -->
          @if (showConfirmVerifyModal()) {
            <div class="modal-backdrop">
              <div class="modal-panel">
                <div class="modal-header">
                  <h3>Xác nhận ép xác thực</h3>
                  <button class="icon-btn" (click)="showConfirmVerifyModal.set(false)"><span class="material-icons-round">close</span></button>
                </div>
                <div class="modal-body">
                  <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
                    Bạn có chắc muốn ép xác thực eKYC cho người dùng này không? Hành động này sẽ cấp quyền truy cập đầy đủ vào nền tảng cho người dùng.
                  </p>
                </div>
                <div class="modal-footer" style="display: flex; gap: var(--space-3);">
                  <button type="button" class="btn btn-secondary" style="flex:1" (click)="showConfirmVerifyModal.set(false)">Hủy</button>
                  <button type="button" class="btn btn-primary" style="flex:1" (click)="executeForceVerify()">Xác nhận</button>
                </div>
              </div>
            </div>
          }

          <!-- Confirm Delete Modal -->
          @if (showConfirmDeleteModal()) {
            <div class="modal-backdrop">
              <div class="modal-panel">
                <div class="modal-header">
                  <h3>Xác nhận xóa tài khoản</h3>
                  <button class="icon-btn" (click)="showConfirmDeleteModal.set(false)"><span class="material-icons-round">close</span></button>
                </div>
                <div class="modal-body">
                  <p style="color: var(--danger); margin-bottom: var(--space-4);">
                    Bạn có chắc muốn xóa tài khoản <strong>{{ selectedUser()?.fullName }}</strong> không? Hành động này sẽ xóa hoàn toàn tài khoản khỏi hệ thống và không thể khôi phục.
                  </p>
                  <p class="text-caption text-muted">Lưu ý: Không thể xóa tài khoản đã có lịch sử giao dịch nạp rút trên hệ thống.</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: var(--space-3);">
                  <button type="button" class="btn btn-secondary" style="flex:1" (click)="showConfirmDeleteModal.set(false)">Hủy</button>
                  <button type="button" class="btn btn-primary" style="flex:1; background: var(--danger);" (click)="executeDeleteUser()">Xác nhận Xóa</button>
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

    .form-select option {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      padding: var(--space-2);
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

    .role-badge.employer, .role-badge.business {
      background: rgba(16, 185, 129, 0.1);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .role-badge.household {
      background: rgba(245, 158, 11, 0.1);
      color: #F59E0B;
      border: 1px solid rgba(245, 158, 11, 0.3);
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

    .data-table thead th {
      position: sticky;
      top: 0;
      z-index: 5;
      background: var(--bg-card);
      box-shadow: 0 1px 0 var(--border-light);
    }


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
  private searchService = inject(AdminSearchService);
  
  showConfirmVerifyModal = signal(false);
  pendingVerifyUserId = signal<string | null>(null);

  showConfirmDeleteModal = signal(false);
  pendingDeleteUserId = signal<string | null>(null);

  users = signal<any[]>([]);
  statusFilter = signal<string>('all');
  roleFilter = signal<string>('all');

  currentPage = signal<number>(1);
  pageSize = 10;
  hasMore = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  totalCount = signal<number>(0);
  
  // Edit Modal State
  isEditModalOpen = signal<boolean>(false);
  selectedUser = signal<any>(null);
  editingEmail = signal<string>('');
  isUpdating = signal<boolean>(false);

  // Dropdown Menu State
  openDropdownId = signal<number | null>(null);

  toggleDropdown(id: number, event: Event) {
    event.stopPropagation();
    this.openDropdownId.set(this.openDropdownId() === id ? null : id);
    
    // Close dropdown when clicking outside
    const closeListener = () => {
      this.openDropdownId.set(null);
      document.removeEventListener('click', closeListener);
    };
    document.addEventListener('click', closeListener);
  }

  filteredUsers = computed(() => {
    return this.users();
  });

  constructor() {
    effect(() => {
      // Trigger API call when search query changes
      const query = this.searchService.searchQuery();
      this.loadUsers(1);
    }, { allowSignalWrites: true });
  }

  onRoleChange(newRole: string) {
    this.roleFilter.set(newRole);
    this.loadUsers(1);
  }

  onStatusChange(newStatus: string) {
    this.statusFilter.set(newStatus);
    this.loadUsers(1);
  }

  loadUsers(page: number = 1) {
    // Avoid multiple concurrent requests or use a debounce in real scenario
    this.isLoading.set(true);
    const role = this.roleFilter();
    const status = this.statusFilter();
    const search = encodeURIComponent(this.searchService.searchQuery().trim());

    this.http.get<any>(`${API_BASE_URL}/admin/users?page=${page}&pageSize=${this.pageSize}&role=${role}&status=${status}&search=${search}`).subscribe({
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
        this.totalCount.set(Array.isArray(res) ? newUsers.length : (res?.totalCount || 0));
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
    this.pendingVerifyUserId.set(userId);
    this.showConfirmVerifyModal.set(true);
  }

  executeForceVerify() {
    const userId = this.pendingVerifyUserId();
    if (!userId) return;

    this.http.post<any>(`${API_BASE_URL}/admin/users/${userId}/force-verify`, {}).subscribe({
      next: (res) => {
        this.toast.success(res.message);
        this.showConfirmVerifyModal.set(false);
        this.pendingVerifyUserId.set(null);
        this.loadUsers(1);
      },
      error: (err) => {
        this.toast.error('Không thể ép xác thực.');
        this.showConfirmVerifyModal.set(false);
        this.pendingVerifyUserId.set(null);
      }
    });
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

  toggleBanUser(user: any) {
    if (!confirm(`Bạn có chắc muốn ${user.isBanned ? 'mở khóa' : 'khóa'} tài khoản này không?`)) return;

    this.http.put<any>(`${API_BASE_URL}/admin/users/${user.id}/ban`, {}).subscribe({
      next: (res) => {
        this.toast.success(res.message);
        this.loadUsers(this.currentPage()); // Reload current page to update status
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Lỗi cập nhật trạng thái khóa tài khoản.');
      }
    });
  }

  confirmDeleteUser(user: any) {
    this.selectedUser.set(user);
    this.pendingDeleteUserId.set(user.id);
    this.showConfirmDeleteModal.set(true);
  }

  executeDeleteUser() {
    const userId = this.pendingDeleteUserId();
    if (!userId) return;

    this.http.delete<any>(`${API_BASE_URL}/admin/users/${userId}`).subscribe({
      next: (res) => {
        this.toast.success(res.message);
        this.showConfirmDeleteModal.set(false);
        this.pendingDeleteUserId.set(null);
        this.selectedUser.set(null);
        this.loadUsers(1);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Lỗi khi xóa tài khoản. Có thể người dùng này đã có dữ liệu ràng buộc.');
        this.showConfirmDeleteModal.set(false);
        this.pendingDeleteUserId.set(null);
        this.selectedUser.set(null);
      }
    });
  }
}
