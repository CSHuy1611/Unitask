import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { JobService } from '../../services/job.service';
import { RouterLink } from '@angular/router';
import { Job } from '../../models/job.model';

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="dashboard-page">
      <div class="container">
        @if (!auth.isLoggedIn() || !auth.isEmployer()) {
          <div class="auth-required glass-card animate-fade-in-up">
            <span class="material-icons-round" style="font-size:64px;color:var(--primary-light)">lock</span>
            <h2>Chỉ dành cho Nhà tuyển dụng</h2>
            <p>Vui lòng đăng nhập bằng tài khoản doanh nghiệp để truy cập dashboard.</p>
            <a routerLink="/login" class="btn btn-primary btn-lg">Đăng nhập</a>
          </div>
        } @else {
          <div class="dashboard-header animate-fade-in-up">
            <div>
              <h1>Dashboard <span class="gradient-text">Nhà tuyển dụng</span></h1>
              <p>Xin chào, {{ auth.currentUser()?.fullName }} 👋</p>
            </div>
            <div style="display:flex; gap:var(--space-3); align-items:center">
              <div style="text-align:right">
                <span style="display:block; font-size:var(--font-size-xs); color:var(--text-muted)">Số dư tài khoản</span>
                <strong style="color:var(--primary-light); font-size:var(--font-size-lg)">
                  {{ (auth.currentUser()?.balance || 0).toLocaleString('vi-VN') }}đ
                </strong>
                @if (auth.currentUser()?.activePackage) {
                  <span style="display:block; font-size:var(--font-size-xs); color:var(--success)">
                    <span class="material-icons-round" style="font-size:12px; vertical-align:middle">stars</span> 
                    {{ auth.currentUser()?.activePackage }}
                  </span>
                }
              </div>
              <a routerLink="/pricing" class="btn btn-secondary btn-sm" title="Nạp thêm tiền">
                <span class="material-icons-round" style="font-size:16px">add</span>
              </a>
              <button class="btn btn-primary" (click)="openNewForm()">
                <span class="material-icons-round">add</span> Đăng việc mới
              </button>
            </div>
          </div>

          <!-- Stats -->
          <div class="stats-grid animate-fade-in-up" style="animation-delay:0.1s">
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#4F46E5,#7C3AED)">
                <span class="material-icons-round">work</span>
              </div>
              <div>
                <span class="stat-number">{{ employerJobs().length }}</span>
                <span class="stat-label">Việc đã đăng</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#10B981,#059669)">
                <span class="material-icons-round">visibility</span>
              </div>
              <div>
                <span class="stat-number">{{ totalViews() }}</span>
                <span class="stat-label">Tổng lượt xem</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#F59E0B,#F97316)">
                <span class="material-icons-round">people</span>
              </div>
              <div>
                <span class="stat-number">{{ totalApplications() }}</span>
                <span class="stat-label">Tổng ứng viên</span>
              </div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#3B82F6,#2563EB)">
                <span class="material-icons-round">verified</span>
              </div>
              <div>
                <span class="stat-number">{{ auth.currentUser()?.ekycStatus === 'verified' ? 'Đã' : 'Chưa' }}</span>
                <span class="stat-label">Xác thực</span>
              </div>
            </div>
          </div>

          <!-- Post / Edit Job Form -->
          @if (showPostForm()) {
            <div class="post-form glass-card animate-fade-in-up">
              <h2>
                <span class="material-icons-round">{{ editingJobId() ? 'edit' : 'edit_note' }}</span>
                {{ editingJobId() ? 'Chỉnh sửa bài đăng' : 'Đăng việc làm mới' }}
              </h2>

              @if (postMessage()) {
                <div class="alert" [class.alert-success]="postSuccess()" [class.alert-error]="!postSuccess()">
                  <span class="material-icons-round">{{ postSuccess() ? 'check_circle' : 'error' }}</span>
                  {{ postMessage() }}
                </div>
              }

              <form (ngSubmit)="onSubmitForm()">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Tiêu đề công việc *</label>
                    <input type="text" class="form-input" placeholder="VD: Frontend Developer Intern"
                           [(ngModel)]="formData.title" name="title" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Loại hình</label>
                    <select class="form-select" [(ngModel)]="formData.type" name="type">
                      <option>Thực tập</option>
                      <option>Part-time</option>
                      <option>Freelance</option>
                      <option>Full-time</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Địa điểm</label>
                    <input type="text" class="form-input" placeholder="VD: TP. Hồ Chí Minh"
                           [(ngModel)]="formData.location" name="location">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Mức lương</label>
                    <input type="text" class="form-input" placeholder="VD: 5 - 8 triệu/tháng"
                           [(ngModel)]="formData.salary" name="salary">
                  </div>
                </div>
                <div class="form-group" style="grid-column: 1 / -1">
                  <label class="form-label">Mô tả công việc <span class="required">*</span></label>
                  <textarea class="form-input" rows="4" [(ngModel)]="formData.description" name="description" placeholder="Mô tả chi tiết công việc..." required></textarea>
                </div>
                <!-- Escrow Budget Input -->
                <div class="form-group" style="grid-column: 1 / -1">
                  <label class="form-label">Ngân sách tính lương (VND) <span class="required">*</span></label>
                  <input type="number" class="form-input" [(ngModel)]="formData.budget" name="budget" placeholder="VD: 300000" min="50000" required>
                  <p class="text-caption" style="margin-top:4px">Hệ thống sẽ giữ khoản tiền trung gian này và thêm 10% phí nền tảng để đảm bảo quyền lợi 2 bên.</p>
                  
                  @if (formData.budget && formData.budget > 0) {
                    <div class="escrow-calc" style="margin-top:12px; padding:16px; background:rgba(79,70,229,0.05); border-radius:var(--radius-lg); border:1px solid var(--primary-light); font-size:var(--font-size-sm); color:var(--text-secondary)">
                      <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                        <span>Lương trả cho ứng viên:</span> <strong>{{ formData.budget.toLocaleString('vi-VN') }}đ</strong>
                      </div>
                      <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                        <span>Phí nền tảng (10%):</span> <strong style="color:var(--warning)">{{ (formData.budget * 0.1).toLocaleString('vi-VN') }}đ</strong>
                      </div>
                      <div style="display:flex; justify-content:space-between; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-color)">
                        <span>Tổng tạm giữ (Escrow):</span> <strong style="color:var(--primary-light); font-size:var(--font-size-lg)">{{ (formData.budget * 1.1).toLocaleString('vi-VN') }}đ</strong>
                      </div>
                    </div>
                  }
                </div>
                <div class="form-group" style="grid-column: 1 / -1">
                  <label class="form-label">Yêu cầu, Tags (cách nhau bằng dấu phẩy)</label>
                  <input type="text" class="form-input" [(ngModel)]="formData.tagsStr" name="tags" placeholder="VD: Sinh viên, Tiếng Anh, Chăm chỉ">
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Hạn nộp hồ sơ</label>
                    <input type="date" class="form-input"
                           [(ngModel)]="formData.deadline" name="deadline">
                  </div>
                  <div class="form-group checkbox-group">
                    <label class="checkbox-label">
                      <input type="checkbox" [(ngModel)]="formData.isRemote" name="isRemote">
                      <span>Có thể làm Remote</span>
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" [(ngModel)]="formData.isUrgent" name="isUrgent">
                      <span>🔥 Tuyển gấp</span>
                    </label>
                  </div>
                </div>
                <div class="form-actions">
                  <button type="button" class="btn btn-secondary" (click)="closeForm()">Hủy</button>
                  <button type="submit" class="btn btn-primary">
                    <span class="material-icons-round">{{ editingJobId() ? 'save' : 'publish' }}</span>
                    {{ editingJobId() ? 'Lưu thay đổi' : 'Đăng tuyển' }}
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- Jobs list -->
          <div class="jobs-section animate-fade-in-up" style="animation-delay:0.2s">
            <h2>Việc đã đăng</h2>
            <div class="jobs-table">
              @for (job of employerJobs(); track job.id) {
                <div class="job-row glass-card" [class.job-expired]="!jobService.isJobEditable(job)">
                  <div class="job-info">
                    <div class="job-title-row">
                      <a [routerLink]="['/jobs', job.id]" class="job-title-link">{{ job.title }}</a>
                      @if (!jobService.isJobEditable(job)) {
                        <span class="badge badge-danger">Hết hạn</span>
                      } @else if (job.isUrgent) {
                        <span class="badge badge-warning">🔥 Gấp</span>
                      } @else {
                        <span class="badge badge-success">Còn hạn</span>
                      }
                    </div>
                    <div class="job-meta">
                      <span>📍 {{ job.location }}</span>
                      <span>💰 {{ job.salary }}</span>
                      <span>⏰ {{ job.type }}</span>
                      <span>📅 Hạn: {{ job.deadline }}</span>
                    </div>
                  </div>
                  <div class="job-actions">
                    <span class="stat-mini">
                      <span class="material-icons-round">visibility</span> {{ job.views }}
                    </span>
                    <span class="stat-mini">
                      <span class="material-icons-round">people</span> {{ job.applications }}
                    </span>
                    @if (jobService.isJobEditable(job) && job.status === 'open') {
                      <button class="btn btn-secondary btn-sm" (click)="onEditJob(job)">
                        <span class="material-icons-round" style="font-size:16px">edit</span> Sửa
                      </button>
                    }
                    
                    @if (job.status === 'open') {
                      <button class="btn btn-primary btn-sm" (click)="viewApplicants(job)">
                        <span class="material-icons-round" style="font-size:16px">group</span> Ứng viên ({{ job.applicants?.length || 0 }})
                      </button>
                    } @else if (job.status === 'in_progress') {
                      <span class="badge badge-warning">Đang thực hiện</span>
                    } @else if (job.status === 'pending_confirmation') {
                      <button class="btn btn-success btn-sm" (click)="approveCompletion(job)" style="gap:4px">
                        <span class="material-icons-round" style="font-size:16px">check_circle</span> Trả lương
                      </button>
                    } @else if (job.status === 'completed') {
                      <span class="badge badge-success">Đã hoàn thành</span>
                    }
                  </div>
                </div>
              } @empty {
                <div class="empty-jobs glass-card">
                  <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">post_add</span>
                  <p>Chưa có việc nào được đăng</p>
                  <button class="btn btn-primary" (click)="openNewForm()">Đăng việc đầu tiên</button>
                </div>
              }
            </div>
          </div>

          <!-- Applicants Modal -->
          @if (selectedJobForApplicants()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header d-flex justify-between items-center mb-6">
                  <h3 style="font-size:1.25rem; font-weight:700">Ứng viên: {{ selectedJobForApplicants()?.title }}</h3>
                  <button class="btn btn-secondary icon-btn" (click)="selectedJobForApplicants.set(null)">
                    <span class="material-icons-round">close</span>
                  </button>
                </div>
                
                <div class="applicants-list d-flex flex-col gap-4">
                  @for (student of applicantUsers(); track student.id) {
                    <div class="applicant-card p-4 rounded-lg bg-secondary border border-light d-flex justify-between items-center">
                      <div class="d-flex items-center gap-3">
                        <div class="avatar-sm" style="width:40px; height:40px; border-radius:50%; background:var(--primary-gradient); display:flex; align-items:center; justify-content:center; color:white; font-weight:700">
                          {{ student.avatar }}
                        </div>
                        <div>
                          <strong style="display:block; color:var(--text-primary)">{{ student.fullName }}</strong>
                          <span style="font-size:0.875rem; color:var(--text-secondary)">{{ student.university }} - {{ student.major }}</span>
                        </div>
                      </div>
                      <button class="btn btn-primary btn-sm" (click)="assignJobToUser(student.id)">
                        Giao việc ngay
                      </button>
                    </div>
                  } @empty {
                    <div class="text-center p-8 text-muted">
                      <span class="material-icons-round" style="font-size:48px; opacity:0.5">group_off</span>
                      <p class="mt-2">Chưa có ứng viên nào ứng tuyển.</p>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .dashboard-page {
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

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .dashboard-header p {
      color: var(--text-secondary);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-5);
      margin-bottom: var(--space-8);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-5);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon .material-icons-round {
      color: white;
      font-size: 24px;
    }

    .stat-number {
      display: block;
      font-size: var(--font-size-2xl);
      font-weight: 800;
    }

    .stat-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .post-form {
      margin-bottom: var(--space-8);
    }

    .post-form h2 {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-xl);
      font-weight: 700;
      margin-bottom: var(--space-6);
    }

    .post-form h2 .material-icons-round {
      color: var(--primary-light);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      justify-content: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      accent-color: var(--primary);
    }

    .form-actions {
      display: flex;
      gap: var(--space-3);
      justify-content: flex-end;
      margin-top: var(--space-4);
    }

    .alert {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-lg);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-5);
    }

    .alert .material-icons-round { font-size: 20px; }

    .alert-success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .jobs-section h2 {
      font-size: var(--font-size-xl);
      font-weight: 700;
      margin-bottom: var(--space-5);
    }

    .jobs-table {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .job-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4) var(--space-5);
      transition: opacity 0.2s;
    }

    .job-row.job-expired {
      opacity: 0.55;
    }

    .job-title-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
    }

    .job-title-link {
      font-weight: 600;
      font-size: var(--font-size-base);
      color: var(--text-primary);
      text-decoration: none;
    }

    .job-title-link:hover { color: var(--primary-light); }

    .job-meta {
      display: flex;
      gap: var(--space-4);
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .job-actions {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .stat-mini {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .stat-mini .material-icons-round { font-size: 16px; }

    .badge-warning {
      background: rgba(245, 158, 11, 0.15);
      color: #F59E0B;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 600;
    }

    .empty-jobs {
      text-align: center;
      padding: var(--space-10);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
    }

    .empty-jobs p { color: var(--text-secondary); }

    @media (max-width: 768px) {
      .dashboard-header { flex-direction: column; gap: var(--space-4); align-items: flex-start; }
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .form-row { grid-template-columns: 1fr; }
      .job-row { flex-direction: column; align-items: flex-start; gap: var(--space-3); }
    }

    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr; }
    }
    
    /* Utility classes for modal */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content { background: var(--bg-dashboard); padding: var(--space-6); border-radius: var(--radius-xl); }
    .d-flex { display: flex; } .flex-col { flex-direction: column; }
    .justify-between { justify-content: space-between; } .items-center { align-items: center; }
    .gap-3 { gap: 12px; } .gap-4 { gap: 16px; }
    .p-4 { padding: 16px; } .p-6 { padding: 24px; } .p-8 { padding: 32px; }
    .mb-6 { margin-bottom: 24px; } .mt-2 { margin-top: 8px; }
    .rounded-lg { border-radius: 8px; }
    .bg-secondary { background: var(--bg-secondary); }
    .border { border: 1px solid var(--border-color); }
    .text-center { text-align: center; }
    .icon-btn { padding: 4px; display: flex; align-items: center; justify-content: center; }
  `]
})
export class EmployerDashboardComponent {
  auth = inject(AuthService);
  jobService = inject(JobService);

  showPostForm = signal(false);
  postSuccess = signal(false);
  postMessage = signal('');
  editingJobId = signal<number | null>(null);

  formData = this.getEmptyForm();

  employerJobs = signal(this.getEmployerJobs());
  totalViews = signal(0);
  totalApplications = signal(0);

  constructor() {
    this.updateStats();
  }

  private getEmptyForm() {
    return {
      title: '',
      type: 'Freelance',
      location: '',
      salary: '',
      budget: null as number | null,
      description: '',
      tagsStr: '',
      deadline: '',
      isRemote: false,
      isUrgent: false,
    };
  }

  private getEmployerJobs() {
    const user = this.auth.currentUser();
    if (user?.companyId) {
      return this.jobService.getJobsByCompanyId(user.companyId);
    }
    return [];
  }

  private updateStats() {
    const jobs = this.employerJobs();
    this.totalViews.set(jobs.reduce((sum, j) => sum + j.views, 0));
    this.totalApplications.set(jobs.reduce((sum, j) => sum + j.applications, 0));
  }

  openNewForm() {
    this.editingJobId.set(null);
    this.formData = this.getEmptyForm();
    this.postMessage.set('');
    this.showPostForm.set(true);
  }

  closeForm() {
    this.showPostForm.set(false);
    this.editingJobId.set(null);
    this.postMessage.set('');
  }

  onEditJob(job: Job) {
    this.editingJobId.set(job.id);
    this.formData = {
      title: job.title,
      type: job.type,
      location: job.location,
      salary: job.salary,
      budget: job.budget || null,
      description: job.description,
      tagsStr: job.tags.join(', '),
      deadline: job.deadline,
      isRemote: job.isRemote || false,
      isUrgent: job.isUrgent || false,
    };
    this.postMessage.set('');
    this.showPostForm.set(true);
  }

  onSubmitForm() {
    if (!this.formData.title) return;
    const user = this.auth.currentUser();
    if (!user) return;

    const tags = this.formData.tagsStr.split(',').map(t => t.trim()).filter(Boolean);

    if (this.editingJobId()) {
      // Edit mode (No fee for editing)
      const result = this.jobService.updateJob(this.editingJobId()!, {
        title: this.formData.title,
        location: this.formData.location,
        type: this.formData.type,
        salary: this.formData.salary,
        budget: this.formData.budget || 0,
        description: this.formData.description,
        tags,
        deadline: this.formData.deadline,
        isRemote: this.formData.isRemote,
        isUrgent: this.formData.isUrgent,
      });

      this.postSuccess.set(result.success);
      this.postMessage.set(result.message);
    } else {
      // Create mode
      const budget = this.formData.budget || 0;
      if (budget < 50000) {
        this.postSuccess.set(false);
        this.postMessage.set('Ngân sách tối thiểu là 50.000đ.');
        return;
      }

      // Payment check
      const commission = budget * 0.1;
      const escrowTotal = budget + commission;
      const hasActivePackage = !!user.activePackage && user.packageExpiry && new Date(user.packageExpiry) > new Date();
      const postingFee = hasActivePackage ? 0 : 200;
      const totalCost = escrowTotal + postingFee;

      const balance = user.balance || 0;
      if (balance < totalCost) {
        this.postSuccess.set(false);
        this.postMessage.set(`Số dư tài khoản không đủ. Tổng cần: ${totalCost.toLocaleString('vi-VN')}đ (Bao gồm tạm giữ lương + 10% phí + ${postingFee}đ đăng tin). Vui lòng nạp thêm tiền.`);
        return;
      }
      
      // Deduct balance
      const deductResult = this.auth.deductBalance(totalCost);
      if (!deductResult.success) {
        this.postSuccess.set(false);
        this.postMessage.set('Lỗi trừ phí đăng tin. Vui lòng thử lại.');
        return;
      }

      this.jobService.addJob({
        title: this.formData.title,
        company: user.companyName || 'My Company',
        companyId: user.companyId || 0,
        companyLogo: user.avatar,
        location: this.formData.location,
        type: this.formData.type,
        salary: this.formData.salary,
        budget: budget,
        commission: commission,
        description: this.formData.description,
        tags,
        deadline: this.formData.deadline,
        isRemote: this.formData.isRemote,
        isUrgent: this.formData.isUrgent,
      });

      this.postSuccess.set(true);
      this.postMessage.set('Đăng việc thành công!');
    }

    this.employerJobs.set(this.getEmployerJobs());
    this.updateStats();

    if (this.postSuccess()) {
      this.formData = this.getEmptyForm();
      setTimeout(() => {
        this.postMessage.set('');
        this.showPostForm.set(false);
        this.editingJobId.set(null);
      }, 2000);
    }
  }

  // --- ESCROW & APPLICANTS LOGIC --- //
  selectedJobForApplicants = signal<Job | null>(null);
  applicantUsers = computed(() => {
    const job = this.selectedJobForApplicants();
    if (!job || !job.applicants) return [];
    // Assuming authService has access to all users for mockup purposes. Since it exposes getAllUsers():
    return this.auth.getAllUsers().filter(u => job.applicants?.includes(u.id));
  });

  viewApplicants(job: Job) {
    this.selectedJobForApplicants.set(job);
  }

  assignJobToUser(studentId: number) {
    const job = this.selectedJobForApplicants();
    if (job) {
      if (confirm('Bạn chắc chắn muốn giao việc cho ứng viên này? (Trạng thái sẽ chuyển sang Đang thực hiện)')) {
         const res = this.jobService.assignJob(job.id, studentId);
         if (res.success) {
           this.auth.addWorkingJob(studentId, job.id);
           this.selectedJobForApplicants.set(null); // close modal
           this.employerJobs.set(this.getEmployerJobs()); // refresh list
           alert('Giao việc thành công!');
         }
      }
    }
  }

  approveCompletion(job: Job) {
    if (confirm(`Bạn xác nhận nghiệm thu công việc này? Số tiền ${job.budget?.toLocaleString('vi-VN')}đ sẽ được chuyển thẳng cho sinh viên.`)) {
      const res = this.jobService.approveJob(job.id);
      if (res.success) {
        // Pay the student
        if (job.selectedStudentId && job.budget) {
          this.auth.payStudent(job.selectedStudentId, job.budget);
        }
        this.employerJobs.set(this.getEmployerJobs()); // refresh list
        alert('Nghiệm thu thành công! Đã giải ngân cho sinh viên.');
      }
    }
  }
}
