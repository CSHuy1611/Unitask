import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { JobService } from '../../services/job.service';
import { ToastService } from '../../services/toast.service';
import { Job } from '../../models/job.model';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../config/api.config';

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
              <button class="btn btn-secondary btn-sm" title="Lịch sử giao dịch" (click)="showTransactions.set(true)">
                <span class="material-icons-round" style="font-size:16px">history</span>
              </button>
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

              @if (!editingJobId()) {
                <div class="template-selector-widget mb-6" style="padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
                  <label class="form-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary)">Sử dụng mẫu công việc nhanh:</label>
                  <div class="templates-list" style="display: flex; flex-wrap: wrap; gap: 8px;">
                    @for (tpl of jobTemplates; track tpl.name) {
                      <button type="button" class="btn btn-secondary btn-sm" (click)="applyTemplate(tpl)" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-full); padding: 6px 12px; font-size: 13px; font-weight: 500;">
                        ✨ {{ tpl.name }}
                      </button>
                    }
                  </div>
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
                    <label class="form-label">Danh mục công việc</label>
                    <select class="form-select" [(ngModel)]="formData.category" name="category">
                      <option value="">-- Chọn danh mục --</option>
                      <option>Marketing & Content</option>
                      <option>IT & Công nghệ</option>
                      <option>Hành chính & Nhân sự (Admin/HR)</option>
                      <option>Kinh doanh & Bán hàng</option>
                      <option>Sự kiện & Giải trí</option>
                      <option>Khác</option>
                    </select>
                  </div>
                </div>
                <div class="form-group" style="grid-column: 1 / -1">
                  <label class="form-label">Mô tả công việc <span class="required">*</span></label>
                  <textarea class="form-input" rows="4" [(ngModel)]="formData.description" name="description" placeholder="Mô tả chi tiết công việc..." required></textarea>
                </div>
                <!-- Escrow Budget & HeadCount Input -->
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Số lượng tuyển <span class="required">*</span></label>
                    <input type="number" class="form-input" [(ngModel)]="formData.headCount" name="headCount" placeholder="VD: 2" min="1" max="100" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tổng ngân sách (VND) <span class="required">*</span></label>
                    <input type="number" class="form-input" [(ngModel)]="formData.budget" name="budget" placeholder="VD: 300000" min="50000" required>
                  </div>
                </div>
                <div class="form-group" style="grid-column: 1 / -1">
                  <p class="text-caption" style="margin-top:-10px; font-size: 13px; color: var(--text-secondary)">Hệ thống sẽ giữ khoản tiền trung gian này và thêm 10% phí nền tảng để đảm bảo quyền lợi 2 bên.</p>
                  
                  @if (formData.budget && formData.budget > 0) {
                    <div style="display:flex; flex-direction:column; gap:4px; margin-top:8px; font-size:var(--font-size-sm); background:rgba(255,255,255,0.03); padding:12px; border-radius:var(--radius-md); border:1px solid rgba(255,255,255,0.05)">
                      <div class="d-flex justify-between">
                        <span>Lương mỗi người (Budget / Số lượng):</span> <strong style="color:var(--success)">{{ getRounded(formData.budget / (formData.headCount || 1)).toLocaleString('vi-VN') }}đ</strong>
                      </div>
                      <div class="d-flex justify-between">
                        <span>Tổng ngân sách trả ứng viên:</span> <strong>{{ getRounded(formData.budget).toLocaleString('vi-VN') }}đ</strong>
                      </div>
                      <div class="d-flex justify-between">
                        <span>Phí nền tảng (10%):</span> <strong style="color:var(--warning)">{{ getRounded(formData.budget * 0.1).toLocaleString('vi-VN') }}đ</strong>
                      </div>
                      <div class="d-flex justify-between" style="margin-top:4px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.1)">
                        <span>Tổng cần thanh toán (Escrow):</span> <strong style="color:var(--primary-light); font-size:var(--font-size-lg)">{{ (getRounded(formData.budget) + getRounded(formData.budget * 0.1)).toLocaleString('vi-VN') }}đ</strong>
                      </div>
                    </div>
                  }
                </div>
                <div class="form-group" style="grid-column: 1 / -1">
                  <label class="form-label">Yêu cầu công việc (cách nhau bằng dấu phẩy)</label>
                  <textarea class="form-input" [(ngModel)]="formData.requirementsStr" name="requirementsStr" rows="2" placeholder="VD: Sinh viên năm 3-4, Có laptop cá nhân, Tiếng Anh giao tiếp cơ bản"></textarea>
                </div>
                <div class="form-group" style="grid-column: 1 / -1">
                  <label class="form-label">Quyền lợi (cách nhau bằng dấu phẩy)</label>
                  <textarea class="form-input" [(ngModel)]="formData.benefitsStr" name="benefitsStr" rows="2" placeholder="VD: Hỗ trợ dấu mộc thực tập, Phụ cấp ăn trưa, Môi trường năng động"></textarea>
                </div>
                <div class="form-group" style="grid-column: 1 / -1">
                  <label class="form-label">Tags (cách nhau bằng dấu phẩy)</label>
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
                      <input type="checkbox" [(ngModel)]="formData.isUrgent" name="isUrgent" (change)="onUrgentChange($event)">
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
                <div class="job-row glass-card" [class.job-expired]="!jobService.isJobEditable(job)" style="display: flex; flex-direction: column; align-items: stretch; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 16px;">
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
                        <span class="material-icons-round">people</span> {{ job.applications }}/{{ job.headCount || 1 }}
                      </span>
                      @if (jobService.isJobEditable(job) && job.status === 'open') {
                        <button class="btn btn-secondary btn-sm" (click)="onEditJob(job)">
                          <span class="material-icons-round" style="font-size:16px">edit</span> Sửa
                        </button>
                      }
                      
                      @if (job.status === 'open') {
                        <button class="btn btn-primary btn-sm" (click)="viewApplicants(job)">
                          <span class="material-icons-round" style="font-size:16px">group</span> Ứng viên ({{ job.applications || 0 }})
                        </button>
                      } @else if (job.status === 'in_progress') {
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px">
                          <span class="badge badge-warning">Đang thực hiện</span>
                          <div style="display:flex; gap:6px">
                            <button class="btn btn-secondary btn-sm" (click)="generateCheckInOtp(job)" style="gap:4px">
                              <span class="material-icons-round" style="font-size:14px">login</span> OTP Check-in
                            </button>
                            <button class="btn btn-secondary btn-sm" (click)="generateCheckOutOtp(job)" style="gap:4px">
                              <span class="material-icons-round" style="font-size:14px">logout</span> OTP Check-out
                            </button>
                          </div>
                          @if (job.checkInTime) {
                            <span style="font-size: 11px; color: var(--success); font-weight: 500;">
                              ✓ Check-in: {{ job.checkInTime | date:'HH:mm dd/MM/yyyy' }}
                            </span>
                          }
                          @if (job.checkOutTime) {
                            <span style="font-size: 11px; color: var(--success); font-weight: 500;">
                              ✓ Check-out: {{ job.checkOutTime | date:'HH:mm dd/MM/yyyy' }}
                            </span>
                          }
                        </div>
                      } @else if (job.status === 'pending_confirmation') {
                        <button class="btn btn-success btn-sm" (click)="jobToApprove.set(job)" style="gap:4px">
                          <span class="material-icons-round" style="font-size:16px">check_circle</span> Trả lương
                        </button>
                        <button class="btn btn-danger btn-sm" (click)="jobToDispute.set(job)" style="gap:4px; background:#EF4444; border-color:#EF4444; color:white">
                          <span class="material-icons-round" style="font-size:16px">gavel</span> Tranh chấp
                        </button>
                      } @else if (job.status === 'disputed') {
                        <span class="badge badge-warning" style="background:rgba(239,68,68,0.15); color:#EF4444">Đang tranh chấp</span>
                      } @else if (job.status === 'completed') {
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px">
                          <span class="badge badge-success">Đã hoàn thành</span>
                          <button class="btn btn-secondary btn-sm" (click)="openReviewModal(job)" style="gap:4px">
                            <span class="material-icons-round" style="font-size:16px">rate_review</span> Đánh giá sinh viên
                          </button>
                        </div>
                      } @else if (job.status === 'closed') {
                        <span class="badge badge-secondary">Đã đóng (Tranh chấp)</span>
                      }
                    </div>
                  </div>

                  <!-- Dispute Evidence Box -->
                  @if (job.status === 'disputed' || (job.status === 'closed' && job.disputeReason)) {
                    <div class="dispute-evidence-box" style="margin-top: 8px; padding: 16px; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(239, 68, 68, 0.2); border-radius: var(--radius-lg); border-left: 4px solid #EF4444;">
                      <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #EF4444; display: flex; align-items: center; gap: 6px;">
                        <span class="material-icons-round" style="font-size: 18px;">gavel</span> 
                        Thông tin Tranh chấp ({{ job.status === 'disputed' ? 'Đang tranh chấp' : 'Đã đóng' }})
                      </h4>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; font-size: 13px;">
                        <!-- Employer side -->
                        <div style="padding: 12px; background: rgba(239, 68, 68, 0.03); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.1);">
                          <strong style="color: #EF4444; display: block; margin-bottom: 6px;">Bằng chứng của bạn:</strong>
                          <p style="margin: 4px 0; color: var(--text-secondary);"><strong>Lý do từ chối:</strong> {{ job.disputeReason }}</p>
                          <p style="margin: 4px 0; color: var(--text-secondary);"><strong>Mô tả bằng chứng:</strong> {{ job.employerEvidenceText || 'Không có mô tả' }}</p>
                          @if (job.employerEvidenceUrl) {
                            <a [href]="job.employerEvidenceUrl" target="_blank" style="color: var(--primary-light); text-decoration: underline; font-weight: 500; display: inline-block; margin-top: 6px;">Xem liên kết bằng chứng</a>
                          }
                        </div>
                        
                        <!-- Student side -->
                        <div style="padding: 12px; background: rgba(79, 70, 229, 0.03); border-radius: 8px; border: 1px solid rgba(79, 70, 229, 0.1);">
                          <strong style="color: var(--primary-light); display: block; margin-bottom: 6px;">Bằng chứng từ sinh viên:</strong>
                          @if (job.studentEvidenceText) {
                            <p style="margin: 4px 0; color: var(--text-secondary);"><strong>Mô tả bằng chứng:</strong> {{ job.studentEvidenceText }}</p>
                            @if (job.studentEvidenceUrl) {
                              <a [href]="job.studentEvidenceUrl" target="_blank" style="color: var(--primary-light); text-decoration: underline; font-weight: 500; display: inline-block; margin-top: 6px;">Xem liên kết bằng chứng</a>
                            }
                          } @else {
                            <p style="margin: 4px 0; color: var(--text-muted); font-style: italic;">Sinh viên chưa nộp bằng chứng chứng minh.</p>
                          }
                        </div>
                      </div>
                    </div>
                  }
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
                  @for (app of jobApplications(); track app.id) {
                    <div class="applicant-card p-4 rounded-lg d-flex flex-col gap-3" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.3s ease; border-radius: 8px;">
                      <div class="d-flex justify-between items-start" style="flex-wrap: wrap; gap: 12px; width: 100%;">
                        <div class="d-flex items-center gap-3">
                          <div class="avatar-sm" style="width:52px; height:52px; border-radius:50%; background:var(--primary-gradient); display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:1.2rem; overflow:hidden; border: 2px solid var(--primary-light)">
                            @if (app.studentAvatarUrl) {
                              <img [src]="app.studentAvatarUrl" alt="Avatar" style="width:100%; height:100%; object-fit:cover" />
                            } @else {
                              {{ app.studentName ? app.studentName[0] : 'U' }}
                            }
                          </div>
                          <div>
                            <div class="d-flex items-center gap-2">
                              <strong style="color:var(--text-primary); font-size:1.15rem">{{ app.studentName }}</strong>
                              @if (app.studentEkycStatus === 'Verified' || app.studentEkycStatus === 'verified') {
                                <span class="material-icons-round" style="font-size:18px; color:var(--success)" title="Đã định danh eKYC">verified</span>
                              }
                            </div>
                            <span style="font-size:0.9rem; color:var(--text-secondary); display:block; margin-top:2px;">
                              🎓 {{ app.studentUniversity }}
                            </span>
                            <span style="font-size:0.85rem; color:var(--text-muted); display:block; margin-top:2px;">
                              📚 Ngành: {{ app.studentMajor }} &bull; Năm thứ {{ app.studentYear }}
                            </span>
                          </div>
                        </div>
                        
                        <div class="d-flex gap-2 items-center">
                          @if (app.studentCVUrl) {
                            <a [href]="app.studentCVUrl" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:6px; background: rgba(var(--primary-rgb), 0.15); color: var(--primary-light); border-color: var(--primary-light); font-size: 0.8rem; padding: 6px 10px;" title="Xem CV trên Cloudinary">
                              <span class="material-icons-round" style="font-size:16px">insert_drive_file</span> Xem CV
                            </a>
                          }
                          @if (app.status === 0) {
                            <button class="btn btn-primary btn-sm" (click)="userToAssign.set(app.id)" style="display:inline-flex; align-items:center; gap:4px; font-size: 0.8rem; padding: 6px 10px;">
                              <span class="material-icons-round" style="font-size:16px">handshake</span> Giao việc
                            </button>
                          } @else if (app.status === 1) {
                            <span class="badge badge-success" style="display:inline-flex; align-items:center; gap:4px; padding: 6px 12px; font-size: 0.8rem;">
                              <span class="material-icons-round" style="font-size:14px">check</span> Đã giao việc
                            </span>
                          } @else if (app.status === 2) {
                            <span class="badge badge-danger" style="display:inline-flex; align-items:center; gap:4px; padding: 6px 12px; font-size: 0.8rem;">
                              <span class="material-icons-round" style="font-size:14px">close</span> Đã từ chối
                            </span>
                          }
                        </div>
                      </div>

                      <!-- Student Academics & Bio -->
                      <div class="student-academic-details" style="padding: 10px 12px; background: rgba(255, 255, 255, 0.02); border-radius: 6px; border-left: 3px solid var(--primary-light); display: flex; flex-direction: column; gap: 8px; width: 100%;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.875rem; width: 100%;">
                          <span style="color:var(--text-secondary)">Điểm trung bình tích lũy GPA:</span>
                          <strong style="color:var(--warning); font-size:1rem">{{ app.studentGpa ? app.studentGpa.toFixed(2) : 'Chưa cập nhật' }} / 4.00</strong>
                        </div>
                        @if (app.studentBio) {
                          <div style="font-size:0.9rem; color:var(--text-secondary); line-height:1.5; font-style:italic; margin-top:4px;">
                            "{{ app.studentBio }}"
                          </div>
                        }
                      </div>

                      <div class="d-flex gap-2 items-center" style="flex-wrap:wrap; width: 100%;">
                        @for (skill of app.studentSkills; track skill) {
                          <span class="badge badge-secondary" style="font-size:0.75rem; background: rgba(255,255,255,0.06); color: var(--text-secondary)">{{ skill }}</span>
                        }
                      </div>
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

          <!-- Confirm Assign Modal -->
          @if (userToAssign()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 450px; text-align: center;">
                <span class="material-icons-round" style="font-size:64px; color:var(--primary); margin-bottom:16px">handshake</span>
                <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Xác nhận giao việc</h3>
                <p style="color:var(--text-secondary); margin-bottom:24px">Bạn chắc chắn muốn giao việc cho ứng viên này? (Trạng thái sẽ chuyển sang Đang thực hiện)</p>
                <div class="form-actions d-flex justify-center gap-3">
                  <button class="btn btn-secondary" (click)="userToAssign.set(null)">Hủy</button>
                  <button class="btn btn-primary" (click)="assignJobToUser(userToAssign()!)">Xác nhận</button>
                </div>
              </div>
            </div>
          }

          <!-- Confirm Approve Modal -->
          @if (jobToApprove()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 450px; text-align: center;">
                <span class="material-icons-round" style="font-size:64px; color:var(--success); margin-bottom:16px">payments</span>
                <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Xác nhận nghiệm thu</h3>
                <p style="color:var(--text-secondary); margin-bottom:24px">Bạn xác nhận nghiệm thu công việc này? Số tiền <strong>{{ jobToApprove()?.budget?.toLocaleString('vi-VN') }}đ</strong> sẽ được chuyển thẳng cho sinh viên.</p>
                <div class="form-actions d-flex justify-center gap-3">
                  <button class="btn btn-secondary" (click)="jobToApprove.set(null)">Hủy</button>
                  <button class="btn btn-success" (click)="approveCompletion(jobToApprove()!)">Nghiệm thu & Trả lương</button>
                </div>
              </div>
            </div>
          }

          <!-- Dispute Completion Modal -->
          @if (jobToDispute()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 500px; text-align: left;">
                <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Báo cáo tranh chấp công việc</h3>
                <p style="color:var(--text-secondary); margin-bottom:16px">Vui lòng cung cấp lý do từ chối nghiệm thu và bằng chứng chứng minh sinh viên chưa hoàn thành.</p>
                
                <div class="form-group mb-4">
                  <label class="form-label" style="display:block; margin-bottom:6px">Lý do tranh chấp *</label>
                  <input type="text" class="form-input" style="width:100%" [(ngModel)]="disputeReasonInput" placeholder="VD: Sinh viên không nộp kết quả đúng hẹn" required>
                </div>
                
                <div class="form-group mb-4">
                  <label class="form-label" style="display:block; margin-bottom:6px">Mô tả bằng chứng chi tiết *</label>
                  <textarea class="form-input" style="width:100%" rows="3" [(ngModel)]="disputeEvidenceText" placeholder="Mô tả cụ thể bằng chứng..." required></textarea>
                </div>

                <div class="form-group mb-6">
                  <label class="form-label" style="display:block; margin-bottom:6px">Link ảnh/tài liệu bằng chứng</label>
                  <input type="text" class="form-input" style="width:100%" [(ngModel)]="disputeEvidenceUrl" placeholder="VD: https://res.cloudinary.com/...">
                </div>

                <div class="form-actions d-flex justify-end gap-3" style="justify-content:flex-end">
                  <button class="btn btn-secondary" (click)="jobToDispute.set(null)">Hủy</button>
                  <button class="btn btn-danger" (click)="submitDispute(jobToDispute()!)" [disabled]="!disputeReasonInput || !disputeEvidenceText">Báo cáo tranh chấp</button>
                </div>
              </div>
            </div>
          }

          <!-- Generated OTP Modal -->
          @if (generatedOtp()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 400px; text-align: center;">
                <span class="material-icons-round" style="font-size:64px; color:var(--primary-light); margin-bottom:16px">
                  {{ otpType() === 'checkin' ? 'login' : 'logout' }}
                </span>
                <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">
                  Mã OTP {{ otpType() === 'checkin' ? 'Check-in' : 'Check-out' }}
                </h3>
                <p style="color:var(--text-secondary); margin-bottom:16px; font-size:14px">
                  Vui lòng cung cấp mã OTP này cho sinh viên để xác nhận thời gian làm việc.
                </p>
                <div style="background: rgba(255,255,255,0.05); border: 2px dashed var(--primary-light); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 24px;">
                  <span style="font-size: 2.5rem; font-weight: 800; letter-spacing: 6px; color: var(--primary-light);">
                    {{ generatedOtp() }}
                  </span>
                </div>
                <button class="btn btn-primary" style="width:100%" (click)="generatedOtp.set('')">Đóng</button>
              </div>
            </div>
          }

          <!-- Review Student Modal -->
          @if (showReviewModal() && selectedJobForReview()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 500px; text-align: left;">
                <div class="modal-header d-flex justify-between items-center mb-6">
                  <h3 style="font-size:1.25rem; font-weight:700">Đánh giá sinh viên</h3>
                  <button class="btn btn-secondary icon-btn" (click)="showReviewModal.set(false)">
                    <span class="material-icons-round">close</span>
                  </button>
                </div>

                <p style="color:var(--text-secondary); margin-bottom:16px; font-size: 14px">
                  Đánh giá của bạn sẽ giúp xây dựng Điểm tin cậy cho sinh viên trên nền tảng UniTask.
                </p>

                <!-- Stars Selector -->
                <div class="form-group mb-4">
                  <label class="form-label" style="display:block; margin-bottom:8px">Mức độ hài lòng *</label>
                  <div style="display: flex; gap: 8px; font-size: 32px; color: var(--warning); cursor: pointer;">
                    @for (star of [1, 2, 3, 4, 5]; track star) {
                      <span class="material-icons-round" (click)="reviewRating = star" style="cursor: pointer;">
                        {{ star <= reviewRating ? 'star' : 'star_border' }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Checklist tags -->
                <div class="form-group mb-4">
                  <label class="form-label" style="display:block; margin-bottom:8px">Đặc điểm nổi bật</label>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    @for (tag of reviewTagsList; track tag) {
                      <button type="button" 
                              class="btn btn-sm" 
                              [class.btn-primary]="reviewTagsSelected.includes(tag)"
                              [class.btn-secondary]="!reviewTagsSelected.includes(tag)"
                              (click)="toggleReviewTag(tag)"
                              style="border-radius: var(--radius-full); padding: 4px 12px; font-size: 13px;">
                        {{ tag }}
                      </button>
                    }
                  </div>
                </div>

                <!-- Comment -->
                <div class="form-group mb-6">
                  <label class="form-label" style="display:block; margin-bottom:8px">Nhận xét chi tiết *</label>
                  <textarea class="form-input" style="width:100%" rows="3" [(ngModel)]="reviewComment" placeholder="Nhập nhận xét của bạn về sinh viên..." required></textarea>
                </div>

                <div class="form-actions d-flex justify-end gap-3" style="justify-content:flex-end">
                  <button class="btn btn-secondary" (click)="showReviewModal.set(false)">Hủy</button>
                  <button class="btn btn-primary" (click)="submitReview()" [disabled]="!reviewComment">Gửi đánh giá</button>
                </div>
              </div>
            </div>
          }

          <!-- Transactions Modal -->
          @if (showTransactions()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto; text-align: left;">
                <div class="modal-header d-flex justify-between items-center mb-6">
                  <h3 style="font-size:1.25rem; font-weight:700">Lịch sử giao dịch</h3>
                  <div class="d-flex gap-3">
                    <button class="btn btn-primary btn-sm" (click)="syncPending()" [disabled]="isSyncing()">
                      <span class="material-icons-round" style="font-size: 16px" [class.rotating]="isSyncing()">sync</span>
                      {{ isSyncing() ? 'Đang đồng bộ...' : 'Đồng bộ' }}
                    </button>
                    <button class="btn btn-secondary icon-btn" (click)="showTransactions.set(false)">
                      <span class="material-icons-round">close</span>
                    </button>
                  </div>
                </div>
                
                <div class="transactions-list">
                  @for (txn of auth.currentUser()?.recentTransactions; track txn.id) {
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                      <div>
                        <strong style="display:block; color:var(--text-primary)">{{ txn.description }}</strong>
                        <span style="font-size: 12px; color: var(--text-muted)">{{ txn.createdAt | date:'HH:mm dd/MM/yyyy' }}</span>
                      </div>
                      <div [ngStyle]="{'color': txn.amount > 0 ? 'var(--success)' : '#EF4444'}" style="font-weight: bold; font-size: 16px;">
                        {{ txn.amount > 0 ? '+' : '' }}{{ txn.amount.toLocaleString('vi-VN') }}đ
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center p-8 text-muted">
                      <span class="material-icons-round" style="font-size: 48px; opacity: 0.5;">receipt_long</span>
                      <p style="margin-top: 12px;">Chưa có giao dịch nào.</p>
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
      .job-actions { flex-wrap: wrap; width: 100%; }
      .job-meta { flex-wrap: wrap; }
      .modal-content { max-width: 95vw !important; padding: var(--space-4) !important; max-height: 85vh !important; }
    }

    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr; }
      .job-actions { flex-direction: column; align-items: stretch; gap: var(--space-2); }
      .stat-mini { font-size: var(--font-size-xs); }
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
export class EmployerDashboardComponent implements OnInit {
  auth = inject(AuthService);
  jobService = inject(JobService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);

  showPostForm = signal(false);
  showTransactions = signal(false);
  isSyncing = signal(false);
  postSuccess = signal(false);
  postMessage = signal('');
  editingJobId = signal<number | null>(null);

  userToAssign = signal<number | null>(null);
  jobToApprove = signal<Job | null>(null);
  jobToDispute = signal<Job | null>(null);
  disputeReasonInput = '';
  disputeEvidenceText = '';
  disputeEvidenceUrl = '';

  // Predefined student job templates according to AGENTS.md
  jobTemplates = [
    {
      name: 'Viết bài Fanpage/Seeding (Marketing)',
      title: 'Cộng tác viên viết bài Fanpage & Seeding',
      type: 'Freelance',
      category: 'Marketing & Content',
      location: 'Remote',
      budget: 300000,
      description: 'Cần sinh viên năng động viết 3 bài post Fanpage và đi seeding trên 10 group Facebook mục tiêu. Sản phẩm: Thời trang giới trẻ.',
      requirementsStr: 'Hiểu biết về trend Gen Z, Có kỹ năng viết content tốt, Có tài khoản Facebook cá nhân để seeding',
      benefitsStr: 'Làm việc hoàn toàn tại nhà, Nhận thù lao ngay sau khi nghiệm thu, Có cơ hội làm lâu dài',
      tagsStr: 'Marketing, Content, Seeding, Fanpage'
    },
    {
      name: 'Thiết kế Banner cơ bản (Marketing)',
      title: 'Thiết kế Banner chạy Ads',
      type: 'Freelance',
      category: 'Marketing & Content',
      location: 'Remote',
      budget: 500000,
      description: 'Cần bạn thiết kế 5 ảnh banner vuông (1080x1080) cho chiến dịch khuyến mãi cuối tháng của shop.',
      requirementsStr: 'Sử dụng thành thạo Canva hoặc Photoshop, Tư duy thẩm mỹ tốt, Bàn giao file gốc, Chỉnh sửa tối đa 2 lần',
      benefitsStr: 'Linh hoạt thời gian, Thêm tác phẩm vào Portfolio, Thưởng nếu banner chạy Ads ra nhiều đơn',
      tagsStr: 'Design, Banner, Canva, Photoshop'
    },
    {
      name: 'Kiểm thử phần mềm / Bug hunting (IT)',
      title: 'Software Testing / Tìm Bug ứng dụng',
      type: 'Freelance',
      category: 'IT & Công nghệ',
      location: 'Remote',
      budget: 400000,
      description: 'Cần sinh viên IT test ứng dụng di động mới ra mắt trên cả iOS và Android. Cung cấp danh sách bug kèm video quay màn hình.',
      requirementsStr: 'Sinh viên năm 2-4 ngành CNTT, Có cả máy iOS và Android là lợi thế, Kỹ năng báo cáo bug rõ ràng',
      benefitsStr: 'Làm quen với quy trình QC/Tester, Thời gian làm việc tự do, Thanh toán nhanh gọn',
      tagsStr: 'IT, Testing, QC, Bug'
    },
    {
      name: 'Viết script ngắn / Crawl dữ liệu (IT)',
      title: 'Crawl dữ liệu website',
      type: 'Freelance',
      category: 'IT & Công nghệ',
      location: 'Remote',
      budget: 600000,
      description: 'Cần một bạn viết script (Python/NodeJS) crawl thông tin sản phẩm từ một trang thương mại điện tử công khai và xuất ra file Excel.',
      requirementsStr: 'Thành thạo Python/NodeJS, Biết dùng Selenium/Puppeteer/BeautifulSoup, Bàn giao mã nguồn',
      benefitsStr: 'Áp dụng kiến thức học vào thực tế, Không gò bó giờ giấc',
      tagsStr: 'Crawl, Python, Code, Script'
    },
    {
      name: 'Nhập liệu văn bản (Admin/HR)',
      title: 'Nhập liệu danh sách khách hàng vào Excel',
      type: 'Freelance',
      category: 'Hành chính & Nhân sự (Admin/HR)',
      location: 'Remote',
      budget: 200000,
      description: 'Cần sinh viên đánh máy cẩn thận nhập liệu 500 thông tin từ file ảnh/PDF sang định dạng Excel theo mẫu.',
      requirementsStr: 'Chăm chỉ, Cẩn thận, Gõ phím nhanh, Thành thạo Excel/Google Sheets',
      benefitsStr: 'Công việc đơn giản, Nhận tiền ngay',
      tagsStr: 'Data entry, Nhập liệu, Admin'
    },
    {
      name: 'Hỗ trợ sự kiện / Lễ tân (Admin)',
      title: 'Hỗ trợ sự kiện khai trương / Check-in',
      type: 'Part-time',
      category: 'Sự kiện & Giải trí',
      location: 'Hà Nội',
      budget: 350000,
      description: 'Cần 2 bạn nam/nữ hỗ trợ check-in khách mời, phát tài liệu và hướng dẫn chỗ ngồi tại hội thảo sự kiện công ty.',
      requirementsStr: 'Ngoại hình sáng, Giao tiếp tốt, Đúng giờ, Trang phục lịch sự (quần âu, áo sơ mi trắng)',
      benefitsStr: 'Được phục vụ ăn nhẹ, Giao lưu với các diễn giả và khách mời doanh nghiệp',
      tagsStr: 'Sự kiện, Lễ tân, Check-in'
    }
  ];

  // OTP signals
  generatedOtp = signal<string>('');
  otpType = signal<'checkin' | 'checkout'>('checkin');

  // Review states
  showReviewModal = signal(false);
  selectedJobForReview = signal<Job | null>(null);
  reviewRating = 5;
  reviewComment = '';
  reviewTagsSelected: string[] = [];
  reviewTagsList = [
    'Đúng giờ',
    'Chăm chỉ',
    'Thái độ tốt',
    'Giao tiếp hiệu quả',
    'Kỹ năng tốt',
    'Hoàn thành xuất sắc',
    'Tự giác'
  ];

  formData = this.getEmptyForm();

  employerJobs = computed(() => {
    const user = this.auth.currentUser();
    if (user?.companyId) {
      return this.jobService.getJobsByCompanyId(user.companyId);
    }
    return [];
  });
  
  totalViews = computed(() => this.employerJobs().reduce((sum, j) => sum + j.views, 0));
  totalApplications = computed(() => this.employerJobs().reduce((sum, j) => sum + j.applications, 0));

  constructor() {
  }

  ngOnInit() {
    // Refresh latest user profile, balance, and jobs list from DB
    this.auth.fetchProfile().subscribe({
      error: (err) => console.error('Failed to refresh employer profile:', err)
    });
    this.auth.fetchBalance().subscribe({
      error: (err) => console.error('Failed to refresh wallet balance:', err)
    });
    this.jobService.fetchJobs();
  }

  private getEmptyForm() {
    return {
      title: '',
      type: 'Freelance',
      category: '',
      location: '',
      headCount: 1,
      budget: null as number | null,
      description: '',
      requirementsStr: '',
      benefitsStr: '',
      tagsStr: '',
      deadline: '',
      isRemote: false,
      isUrgent: false,
    };
  }

  // Stats are now computed automatically, no need for manual methods

  openNewForm() {
    const user = this.auth.currentUser();
    if (user && user.blacklistCount !== undefined && user.blacklistCount >= 3) {
      this.toast.error('Tài khoản của bạn đã bị cấm đăng việc do vi phạm chính sách (> 3 cảnh cáo).');
      return;
    }
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

  getRounded(value: number): number {
    return Math.round(value);
  }

  onEditJob(job: Job) {
    this.editingJobId.set(job.id);
    this.formData = {
      title: job.title,
      type: job.type,
      category: (job as any).category || '',
      location: job.location,
      headCount: job.headCount || 1,
      budget: job.budget || null,
      description: job.description,
      requirementsStr: (job.requirements || []).join(', '),
      benefitsStr: (job.benefits || []).join(', '),
      tagsStr: job.tags.join(', '),
      deadline: job.deadline,
      isRemote: job.isRemote || false,
      isUrgent: job.isUrgent || false,
    };
    this.postMessage.set('');
    this.showPostForm.set(true);
  }

  onUrgentChange(event: any) {
    const user = this.auth.currentUser();
    if (!user) return;
    const hasActivePackage = !!user.activePackage && user.packageExpiry && new Date(user.packageExpiry) > new Date();
    if (this.formData.isUrgent && !hasActivePackage) {
      this.formData.isUrgent = false;
      this.toast.warning('Chức năng "Tuyển gấp" yêu cầu tài khoản phải đăng ký gói dịch vụ.');
    }
  }

  onSubmitForm() {
    if (!this.formData.title) return;
    const user = this.auth.currentUser();
    if (!user) return;

    const hasActivePackage = !!user.activePackage && user.packageExpiry && new Date(user.packageExpiry) > new Date();
    if (this.formData.isUrgent && !hasActivePackage) {
      this.postSuccess.set(false);
      this.postMessage.set('Chức năng tuyển gấp chỉ dành cho nhà tuyển dụng có gói dịch vụ đang hoạt động. Vui lòng mua gói dịch vụ để sử dụng.');
      this.toast.error('Vui lòng mua gói dịch vụ để đăng tin tuyển gấp!');
      return;
    }

    const tags = this.formData.tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const requirements = this.formData.requirementsStr.split(',').map(r => r.trim()).filter(Boolean);
    const benefits = this.formData.benefitsStr.split(',').map(b => b.trim()).filter(Boolean);

    if (this.editingJobId()) {
      // Edit mode (No fee for editing)
      this.jobService.updateJob(this.editingJobId()!, {
        title: this.formData.title,
        location: this.formData.location,
        type: this.formData.type,
        category: this.formData.category,
        salary: this.formData.budget ? `${this.formData.budget.toLocaleString('vi-VN')}đ` : 'Thỏa thuận',
        budget: this.formData.budget || 0,
        description: this.formData.description,
        requirements,
        benefits,
        tags,
        deadline: this.formData.deadline,
        isRemote: this.formData.isRemote,
        isUrgent: this.formData.isUrgent,
      } as any).subscribe({
        next: (result) => {
          this.postSuccess.set(result.success);
          this.postMessage.set(result.message);
          if (result.success) {
            this.toast.success(result.message || 'Cập nhật công việc thành công!');
            setTimeout(() => this.closeForm(), 1500);
          } else {
            this.toast.error(result.message || 'Cập nhật công việc thất bại.');
          }
        },
        error: (err) => {
          this.postSuccess.set(false);
          const errMsg = err.error?.message || 'Có lỗi xảy ra khi cập nhật.';
          this.postMessage.set(errMsg);
          this.toast.error(errMsg);
        }
      });
    } else {
      // Create mode
      if (user.ekycStatus !== 'verified') {
        this.postSuccess.set(false);
        this.postMessage.set('Tài khoản của bạn chưa được xác nhận danh tính (eKYC). Vui lòng cập nhật CCCD trong hồ sơ và chờ duyệt để đăng tin.');
        this.toast.error('Vui lòng hoàn thành xác thực eKYC trước khi đăng tin!');
        return;
      }

      const budget = this.formData.budget || 0;
      if (budget < 50000) {
        this.postSuccess.set(false);
        this.postMessage.set('Ngân sách tối thiểu là 50.000đ.');
        this.toast.error('Ngân sách tối thiểu là 50.000đ.');
        return;
      }

      // Payment check
      const commission = Math.round(budget * 0.1);
      const escrowTotal = budget + commission;
      const hasActivePackage = !!user.activePackage && user.packageExpiry && new Date(user.packageExpiry) > new Date();
      const postingFee = hasActivePackage ? 0 : 2000;
      const totalCost = escrowTotal + postingFee;

      const balance = user.balance || 0;
      if (balance < totalCost) {
        const errStr = `Số dư tài khoản không đủ. Tổng cần: ${totalCost.toLocaleString('vi-VN')}đ (Bao gồm tạm giữ lương + 10% phí + ${postingFee.toLocaleString('vi-VN')}đ đăng tin). Vui lòng nạp thêm tiền.`;
        this.postSuccess.set(false);
        this.postMessage.set(errStr);
        this.toast.error('Số dư ví không đủ để ký quỹ công việc này!');
        return;
      }
      
      // Deduct balance
      const deductResult = this.auth.deductBalance(totalCost);
      if (!deductResult.success) {
        this.postSuccess.set(false);
        this.postMessage.set('Lỗi trừ phí đăng tin. Vui lòng thử lại.');
        this.toast.error('Lỗi trừ phí đăng tin.');
        return;
      }

      this.jobService.addJob({
        title: this.formData.title,
        company: user.companyName || user.fullName || 'My Company',
        companyId: user.companyId || user.id || 0,
        companyLogo: user.companyLogoUrl || user.avatarUrl || user.avatar,
        location: this.formData.location,
        type: this.formData.type,
        category: this.formData.category,
        salary: this.formData.budget ? `${this.formData.budget.toLocaleString('vi-VN')}đ` : 'Thỏa thuận',
        headCount: this.formData.headCount || 1,
        budget: budget,
        commission: commission,
        description: this.formData.description,
        requirements,
        benefits,
        tags,
        deadline: this.formData.deadline,
        isRemote: this.formData.isRemote,
        isUrgent: this.formData.isUrgent,
      } as any).subscribe({
        next: (result) => {
          this.postSuccess.set(result.success);
          this.postMessage.set(result.message);
          if (result.success) {
            this.toast.success(result.message || 'Đăng bài tuyển dụng thành công!');
            this.auth.fetchBalance().subscribe();
            setTimeout(() => this.closeForm(), 1500);
          } else {
            this.toast.error(result.message || 'Đăng bài tuyển dụng thất bại.');
          }
        },
        error: (err) => {
          this.postSuccess.set(false);
          const errMsg = err.error?.message || 'Có lỗi xảy ra khi đăng tin.';
          this.postMessage.set(errMsg);
          this.toast.error(errMsg);
        }
      });
    }
  }

  // --- ESCROW & APPLICANTS LOGIC --- //
  selectedJobForApplicants = signal<Job | null>(null);
  jobApplications = signal<any[]>([]);

  viewApplicants(job: Job) {
    this.selectedJobForApplicants.set(job);
    this.jobApplications.set([]);
    this.jobService.getJobApplications(job.id).subscribe({
      next: (apps) => this.jobApplications.set(apps),
      error: () => this.toast.error('Không thể tải danh sách ứng viên.')
    });
  }

  assignJobToUser(applicationId: number) {
    this.jobService.assignJob(applicationId).subscribe({
      next: (res) => {
        if (res.success) {
          this.selectedJobForApplicants.set(null); // close modal
          this.userToAssign.set(null); // close confirm modal
          this.toast.success('Giao việc thành công!');
        } else {
          this.toast.error(res.message || 'Có lỗi xảy ra khi giao việc');
        }
      },
      error: () => this.toast.error('Có lỗi xảy ra khi giao việc')
    });
  }

  approveCompletion(job: Job) {
    this.jobService.approveJob(job.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.jobToApprove.set(null); // close modal
          this.toast.success('Nghiệm thu thành công! Đã giải ngân cho sinh viên.');
        } else {
          this.toast.error(res.message || 'Có lỗi xảy ra khi nghiệm thu');
        }
      },
      error: () => this.toast.error('Lỗi kết nối khi nghiệm thu.')
    });
  }

  submitDispute(job: Job) {
    if (!this.disputeReasonInput || !this.disputeEvidenceText) return;
    this.jobService.rejectCompletion(job.id, this.disputeReasonInput, this.disputeEvidenceText, this.disputeEvidenceUrl).subscribe({
      next: (res) => {
        if (res.success) {
          this.jobToDispute.set(null);
          this.disputeReasonInput = '';
          this.disputeEvidenceText = '';
          this.disputeEvidenceUrl = '';
          this.toast.success('Đã báo cáo tranh chấp lên Admin.');
        } else {
          this.toast.error(res.message || 'Lỗi gửi tranh chấp.');
        }
      },
      error: () => this.toast.error('Lỗi kết nối khi gửi tranh chấp.')
    });
  }

  applyTemplate(tpl: any) {
    this.formData.title = tpl.title;
    this.formData.type = tpl.type;
    this.formData.category = tpl.category || '';
    this.formData.location = tpl.location;
    this.formData.budget = tpl.budget;
    this.formData.description = tpl.description;
    this.formData.requirementsStr = tpl.requirementsStr;
    this.formData.benefitsStr = tpl.benefitsStr;
    this.formData.tagsStr = tpl.tagsStr;
    this.toast.success(`Đã áp dụng mẫu công việc: "${tpl.name}"`);
  }

  generateCheckInOtp(job: Job) {
    this.jobService.generateCheckInOtp(job.id).subscribe({
      next: (res) => {
        if (res.success && res.otp) {
          this.otpType.set('checkin');
          this.generatedOtp.set(res.otp);
        } else {
          this.toast.error(res.message || 'Không thể tạo OTP check-in.');
        }
      },
      error: () => this.toast.error('Lỗi kết nối khi tạo OTP.')
    });
  }

  generateCheckOutOtp(job: Job) {
    this.jobService.generateCheckOutOtp(job.id).subscribe({
      next: (res) => {
        if (res.success && res.otp) {
          this.otpType.set('checkout');
          this.generatedOtp.set(res.otp);
        } else {
          this.toast.error(res.message || 'Không thể tạo OTP check-out.');
        }
      },
      error: () => this.toast.error('Lỗi kết nối khi tạo OTP.')
    });
  }

  openReviewModal(job: Job) {
    this.selectedJobForReview.set(job);
    this.reviewRating = 5;
    this.reviewComment = '';
    this.reviewTagsSelected = [];
    this.showReviewModal.set(true);
  }

  toggleReviewTag(tag: string) {
    if (this.reviewTagsSelected.includes(tag)) {
      this.reviewTagsSelected = this.reviewTagsSelected.filter(t => t !== tag);
    } else {
      this.reviewTagsSelected = [...this.reviewTagsSelected, tag];
    }
  }

  submitReview() {
    const job = this.selectedJobForReview();
    if (!job) return;
    this.jobService.submitReview(job.id, 'employer', this.reviewRating, this.reviewTagsSelected, this.reviewComment).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(res.message);
          this.showReviewModal.set(false);
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => this.toast.error('Lỗi gửi đánh giá.')
    });
  }

  syncPending() {
    this.isSyncing.set(true);
    this.http.post<any>(`${API_BASE_URL}/payment/sync-pending`, {}).subscribe({
      next: (res) => {
        if (res.success && res.syncedCount > 0) {
          this.toast.success(`Đã đồng bộ thành công ${res.syncedCount} giao dịch!`);
          this.auth.fetchBalance().subscribe();
        } else {
          this.toast.success('Không có giao dịch nào cần đồng bộ (hoặc chưa thanh toán thành công).');
        }
        this.isSyncing.set(false);
      },
      error: () => {
        this.toast.error('Lỗi khi đồng bộ giao dịch.');
        this.isSyncing.set(false);
      }
    });
  }
}
