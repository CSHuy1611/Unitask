import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="admin-page">
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
            <a routerLink="/admin/users" class="admin-tab active">
              <span class="material-icons-round">people</span> Quản lý User
            </a>
          </div>

          <div class="dashboard-header animate-fade-in-up" style="animation-delay:0.1s">
            <div class="header-left">
              <h1>Quản lý <span class="gradient-text">Người dùng & eKYC</span></h1>
              <p>Phê duyệt hồ sơ và quản lý tài khoản</p>
            </div>
            <div class="header-actions">
              <div class="filter-group">
                <span class="material-icons-round">filter_list</span>
                <select class="form-select status-select" [(ngModel)]="statusFilter">
                  <option value="all">Tất cả trạng thái eKYC</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="verified">Đã xác thực</option>
                  <option value="none">Chưa xác thực</option>
                  <option value="rejected">Bị từ chối</option>
                </select>
              </div>
              <div class="filter-group">
                <span class="material-icons-round">category</span>
                <select class="form-select role-select" [(ngModel)]="roleFilter">
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
                            <strong>{{ user.fullName }}</strong>
                            <span class="text-caption">{{ user.role === 'student' ? user.university : user.companyName }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="role-badge" [class]="user.role">
                          {{ user.role === 'student' ? 'Sinh viên' : 'Nhà tuyển dụng' }}
                        </span>
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
                        @if (user.ekycStatus === 'pending') {
                          <div class="action-buttons">
                            <button class="btn btn-success btn-sm icon-btn" title="Duyệt" (click)="auth.approveEkyc(user.id); loadUsers()">
                              <span class="material-icons-round">check</span>
                            </button>
                            <button class="btn btn-danger btn-sm icon-btn" title="Từ chối" (click)="auth.rejectEkyc(user.id); loadUsers()">
                              <span class="material-icons-round">close</span>
                            </button>
                          </div>
                        } @else {
                          <span class="text-muted">-</span>
                        }
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
          </div>
        }
      </div>
    </section>
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

    .action-buttons {
      display: flex;
      gap: var(--space-2);
    }

    .icon-btn {
      padding: 6px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-btn .material-icons-round { font-size: 18px; }

    .btn-success { background: var(--success); color: white; border: none; }
    .btn-success:hover { background: #059669; }

    .btn-danger { background: #EF4444; color: white; border: none; }
    .btn-danger:hover { background: #DC2626; }

    .empty-state {
      text-align: center;
      padding: var(--space-10);
    }

    .empty-state p { margin-top: var(--space-3); color: var(--text-secondary); }
    .text-muted { color: var(--text-muted); }

    @media (max-width: 900px) {
      .dashboard-header { flex-direction: column; align-items: flex-start; gap: var(--space-4); }
      .header-actions { flex-wrap: wrap; }
    }
  `]
})
export class AdminUsersComponent {
  auth = inject(AuthService);
  
  users = signal<User[]>([]);
  statusFilter = signal<string>('all');
  roleFilter = signal<string>('all');

  filteredUsers = computed(() => {
    let result = this.users();
    
    if (this.statusFilter() !== 'all') {
      result = result.filter(u => u.ekycStatus === this.statusFilter());
    }
    
    if (this.roleFilter() !== 'all') {
      result = result.filter(u => u.role === this.roleFilter());
    }

    return result;
  });

  constructor() {
    this.loadUsers();
  }

  loadUsers() {
    this.users.set(this.auth.getAllUsers());
  }
}
