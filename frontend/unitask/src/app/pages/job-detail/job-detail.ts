import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';
import { ToastService } from '../../services/toast.service';
import { Job } from '../../models/job.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    @if (job()) {
      <section class="detail-page">
        <div class="container">
          <a (click)="goBack()" class="back-link animate-fade-in" style="cursor: pointer;">
            <span class="material-icons-round">arrow_back</span> Quay lại
          </a>

          <div class="detail-grid">
            <!-- Main -->
            <div class="detail-main animate-fade-in-up">
              <div class="detail-header glass-card">
                <div class="header-top">
                  <div class="company-logo" [class.premium-avatar-glow]="job()!.isCompanyPremium" [style.background]="getLogoGradient()">
                    {{ job()!.companyLogo }}
                  </div>
                  <div class="header-info">
                    <h1>{{ job()!.title }}</h1>
                    <div class="header-meta">
                      <span class="meta-item">
                        <span class="material-icons-round">business</span>
                        {{ job()!.company }}
                        @if (job()!.employerType === 1) {
                          <span class="badge badge-warning" style="font-size: 10px; padding: 2px 6px; margin-left: 4px;">🏠 Hộ KD</span>
                        } @else {
                          <span class="badge badge-primary" style="font-size: 10px; padding: 2px 6px; margin-left: 4px;">🏢 Doanh nghiệp</span>
                        }
                        @if (job()!.isCompanyPremium) {
                          <span class="premium-badge" title="Nhà tuyển dụng Premium">
                            <span class="material-icons-round" style="font-size: 14px;">workspace_premium</span>
                          </span>
                        }
                      </span>
                      <span class="meta-item">
                        <span class="material-icons-round">location_on</span>
                        {{ job()!.location }}
                      </span>
                      <span class="meta-item">
                        <span class="material-icons-round">schedule</span>
                        {{ job()!.type }}
                      </span>
                      @if (job()!.workStartTime && job()!.workEndTime) {
                        <span class="meta-item" style="color: var(--primary-light);">
                          <span class="material-icons-round">access_time</span>
                          {{ formatAmPm(job()!.workStartTime!) }} - {{ formatAmPm(job()!.workEndTime!) }}@if(job()!.workDate) { ({{ job()!.workDate | date:'dd/MM/yyyy' }}) }
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <div class="badges-row">
                  @if (job()!.isUrgent) {
                    <span class="badge badge-danger">🔥 Tuyển gấp</span>
                  }
                  @if (job()!.isRemote) {
                    <span class="badge badge-success">🌐 Remote</span>
                  }
                  @for (tag of job()!.tags; track tag) {
                    <span class="badge badge-primary">{{ tag }}</span>
                  }
                </div>
              </div>

              <!-- Description -->
              <div class="detail-section glass-card">
                <h2><span class="material-icons-round">description</span> Mô tả công việc</h2>
                <p class="description-text">{{ job()!.description }}</p>
              </div>

              <!-- Requirements -->
              <div class="detail-section glass-card">
                <h2><span class="material-icons-round">checklist</span> Yêu cầu</h2>
                <ul class="req-list">
                  @for (req of job()!.requirements; track req) {
                    <li>
                      <span class="material-icons-round check-icon">check_circle</span>
                      {{ req }}
                    </li>
                  }
                </ul>
              </div>

              <!-- Benefits -->
              <div class="detail-section glass-card">
                <h2><span class="material-icons-round">card_giftcard</span> Quyền lợi</h2>
                <ul class="benefit-list">
                  @for (benefit of job()!.benefits; track benefit) {
                    <li>
                      <span class="material-icons-round star-icon">star</span>
                      {{ benefit }}
                    </li>
                  }
                </ul>
              </div>

              <!-- Dispute section for assigned student -->
              @if (job()!.status === 'disputed' && job()!.selectedStudentId?.toString() === auth.currentUser()?.id?.toString()) {
                <div class="detail-section glass-card" style="border: 1px solid #EF4444;">
                  <h2 style="color:#EF4444; margin-bottom:12px"><span class="material-icons-round" style="color:#EF4444; vertical-align:middle; margin-right:6px">gavel</span> Tranh chấp đang diễn ra</h2>
                  <p style="color:var(--text-secondary); margin-bottom:16px; font-size:0.95rem">Nhà tuyển dụng đã từ chối nghiệm thu với lý do: <strong style="color:var(--text-primary)">"{{ job()!.disputeReason }}"</strong></p>
                  
                  @if (job()!.studentEvidenceText) {
                    <div class="alert alert-success" style="background:rgba(16,185,129,0.1); color:var(--success); padding:10px 14px; border-radius:6px; font-size:0.9rem; margin-bottom:12px">
                      <span class="material-icons-round" style="font-size:18px; vertical-align:middle; margin-right:4px">check_circle</span> Bạn đã nộp bằng chứng chứng minh. Đang chờ Admin phán quyết.
                    </div>
                    <div style="margin-top:12px; padding:12px; background:rgba(255,255,255,0.03); border-radius:6px; border:1px solid rgba(255,255,255,0.08)">
                      <strong style="display:block; margin-bottom:6px; font-size:0.9rem">Bằng chứng của bạn:</strong> 
                      <p style="font-size:0.9rem; color:var(--text-secondary); line-height:1.5">{{ job()!.studentEvidenceText }}</p>
                      @if (job()!.studentEvidenceUrl) {
                        <div style="margin-top:10px">
                          <a [href]="job()!.studentEvidenceUrl" target="_blank" style="color:var(--primary-light); font-size:0.85rem; font-weight:600; text-decoration:underline">Xem ảnh/tài liệu bằng chứng</a>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="form-group mb-4" style="margin-bottom:16px">
                      <label class="form-label" style="display:block; margin-bottom:6px; font-size:0.9rem">Mô tả bằng chứng hoàn thành của bạn *</label>
                      <textarea class="form-input" style="width:100%" rows="3" [(ngModel)]="studentEvidenceText" placeholder="Mô tả cụ thể kết quả công việc đã thực hiện..." required></textarea>
                    </div>
                    
                    <div class="form-group mb-4" style="margin-bottom:16px">
                      <label class="form-label" style="display:block; margin-bottom:6px; font-size:0.9rem">Link hình ảnh/tài liệu bằng chứng</label>
                      <input type="text" class="form-input" style="width:100%" [(ngModel)]="studentEvidenceUrl" placeholder="VD: https://res.cloudinary.com/...">
                    </div>

                    <button class="btn btn-primary" (click)="onSubmitEvidence()" [disabled]="!studentEvidenceText">Nộp bằng chứng</button>
                  }
                </div>
              }
            </div>

            <!-- Sidebar -->
            <div class="detail-sidebar animate-fade-in-up" style="animation-delay:0.2s">
              <div class="sidebar-card glass-card">
                <div class="salary-box">
                  <span class="salary-label">Mức lương</span>
                  <span class="salary-value">{{ job()!.salary }}</span>
                </div>

                <div class="info-grid">
                  <div class="info-item">
                    <span class="material-icons-round">calendar_today</span>
                    <div>
                      <span class="info-label">Ngày đăng</span>
                      <span class="info-value">{{ job()!.postedDate }}</span>
                    </div>
                  </div>
                  <div class="info-item">
                    <span class="material-icons-round">event</span>
                    <div>
                      <span class="info-label">Hạn nộp</span>
                      <span class="info-value">{{ job()!.deadline }}</span>
                    </div>
                  </div>
                  @if (job()!.workStartTime && job()!.workEndTime) {
                    <div class="info-item">
                      <span class="material-icons-round">schedule</span>
                      <div>
                        <span class="info-label">Ca làm việc</span>
                        <span class="info-value">{{ formatAmPm(job()!.workStartTime!) }} - {{ formatAmPm(job()!.workEndTime!) }}</span>
                      </div>
                    </div>
                  }
                  @if (job()!.workDays) {
                    <div class="info-item">
                      <span class="material-icons-round">calendar_month</span>
                      <div>
                        <span class="info-label">Lịch làm việc</span>
                        <span class="info-value">{{ job()!.workDays }}</span>
                      </div>
                    </div>
                  }
                  @if (job()!.workDate) {
                    <div class="info-item">
                      <span class="material-icons-round">event_available</span>
                      <div>
                        <span class="info-label">Ngày làm việc</span>
                        <span class="info-value">{{ job()!.workDate | date:'dd/MM/yyyy' }}</span>
                      </div>
                    </div>
                  }
                  <div class="info-item">
                    <span class="material-icons-round">visibility</span>
                    <div>
                      <span class="info-label">Lượt xem</span>
                      <span class="info-value">{{ job()!.views }}</span>
                    </div>
                  </div>
                  <div class="info-item">
                    <span class="material-icons-round">people</span>
                    <div>
                      <span class="info-label">Ứng viên</span>
                      <span class="info-value">{{ job()!.applications }}</span>
                    </div>
                  </div>
                </div>

                @if (auth.isLoggedIn() && auth.isStudent()) {
                  @if (auth.currentUser()?.blacklistCount !== undefined && auth.currentUser()!.blacklistCount! >= 3) {
                    <button class="btn btn-danger btn-lg full-width" disabled style="background:#EF4444; border-color:#EF4444; color:white">
                      <span class="material-icons-round">block</span> Tài khoản bị khóa
                    </button>
                  } @else if (job()!.status !== 'open') {
                    <button class="btn btn-secondary btn-lg full-width" disabled>
                      <span class="material-icons-round">block</span> Đã tuyển đủ người
                    </button>
                  } @else if (applied()) {
                    <button class="btn btn-secondary btn-lg full-width" disabled>
                      <span class="material-icons-round">check</span> Đã ứng tuyển
                    </button>
                  } @else {
                    <button class="btn btn-primary btn-lg full-width" (click)="onApply()">
                      <span class="material-icons-round">send</span> Ứng tuyển ngay
                    </button>
                  }
                } @else if (!auth.isLoggedIn()) {
                  <a routerLink="/login" class="btn btn-primary btn-lg full-width">
                    <span class="material-icons-round">login</span> Đăng nhập để ứng tuyển
                  </a>
                }
              </div>

              <!-- Company info -->
              @if (companyInfo()) {
                <div class="sidebar-card glass-card">
                  <h3>Về {{ companyInfo()!.name }}</h3>
                  <p class="company-desc">{{ companyInfo()!.description }}</p>
                  <div class="company-details">
                    <div class="detail-item">
                      <span class="material-icons-round">factory</span>
                      {{ companyInfo()!.industry }}
                    </div>
                    <div class="detail-item">
                      <span class="material-icons-round">groups</span>
                      {{ companyInfo()!.size }}
                    </div>
                    <div class="detail-item">
                      <span class="material-icons-round">location_on</span>
                      {{ companyInfo()!.location }}
                    </div>
                    @if (companyInfo()!.isVerified) {
                      <div class="detail-item verified">
                        <span class="material-icons-round">verified</span>
                        Đã xác thực
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </section>
    } @else {
      <section class="detail-page">
        <div class="container">
          <div class="empty-state glass-card">
            <span class="material-icons-round" style="font-size:64px;color:var(--text-muted)">work_off</span>
            <h2>Không tìm thấy việc làm</h2>
            <a (click)="goBack()" class="btn btn-primary" style="cursor: pointer;">Quay lại</a>
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    .detail-page {
      padding: calc(80px + var(--space-8)) 0 var(--space-16);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-6);
      transition: all var(--transition-fast);
    }

    .back-link:hover {
      color: var(--primary-light);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: var(--space-6);
      align-items: start;
    }

    .detail-main {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    .header-top {
      display: flex;
      gap: var(--space-5);
      margin-bottom: var(--space-5);
    }

    .company-logo {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-xl);
      font-weight: 800;
      color: white;
      flex-shrink: 0;
    }

    .header-info h1 {
      font-size: var(--font-size-2xl);
      font-weight: 800;
      margin-bottom: var(--space-3);
    }

    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .meta-item .material-icons-round { font-size: 18px; }

    .badges-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .detail-section h2 {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-lg);
      font-weight: 700;
      margin-bottom: var(--space-5);
    }

    .detail-section h2 .material-icons-round {
      color: var(--primary-light);
      font-size: 22px;
    }

    .description-text {
      color: var(--text-secondary);
      line-height: 1.8;
    }

    .req-list, .benefit-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .req-list li, .benefit-list li {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      line-height: 1.6;
    }

    .check-icon {
      color: var(--success);
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .star-icon {
      color: var(--accent);
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Sidebar */
    .detail-sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      position: sticky;
      top: 80px;
    }

    .sidebar-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .salary-box {
      text-align: center;
      padding: var(--space-5);
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: var(--radius-lg);
    }

    .salary-label {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-bottom: var(--space-1);
    }

    .salary-value {
      font-size: var(--font-size-xl);
      font-weight: 800;
      color: var(--accent);
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .info-item .material-icons-round {
      color: var(--text-muted);
      font-size: 20px;
    }

    .info-label {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .info-value {
      font-size: var(--font-size-sm);
      font-weight: 600;
    }

    .full-width { width: 100%; }

    .sidebar-card h3 {
      font-size: var(--font-size-base);
      font-weight: 700;
    }

    .company-desc {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.7;
    }

    .company-details {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .detail-item .material-icons-round { font-size: 18px; }

    .detail-item.verified {
      color: var(--success);
    }

    .empty-state {
      text-align: center;
      padding: var(--space-16);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
    }

    @media (max-width: 900px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }

      .detail-sidebar {
        position: static;
      }
    }

    @media (max-width: 480px) {
      .header-top { flex-direction: column; }
    }
  `]
})
export class JobDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private jobService = inject(JobService);
  private companyService = inject(CompanyService);
  private router = inject(Router);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  locationService = inject(Location);

  job = signal<Job | null>(null);
  applied = signal(false);
  companyInfo = signal<any>(null);

  studentEvidenceText = '';
  studentEvidenceUrl = '';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.jobService.fetchJobDetail(id).subscribe({
      next: (found) => {
        this.job.set(found);
        this.applied.set(found.isAppliedByCurrentUser || false);
        const mockCompany = this.companyService.getById(found.companyId);
        if (mockCompany) {
          this.companyInfo.set(mockCompany);
        } else {
          this.companyInfo.set({
            name: found.company || 'Doanh nghiệp tuyển dụng',
            description: found.companyDescription || 'Chưa cập nhật giới thiệu công ty.',
            industry: found.companyIndustry || 'Chưa cập nhật lĩnh vực hoạt động',
            size: found.companySize || 'Chưa cập nhật quy mô',
            location: found.companyLocation || found.location || 'Chưa cập nhật địa chỉ',
            website: found.companyWebsite || '#',
            isVerified: true
          });
        }
      },
      error: (err) => {
        this.toast.error('Không thể tải chi tiết công việc. Vui lòng thử lại sau.');
        this.router.navigate(['/jobs']);
      }
    });
  }

  getLogoGradient(): string {
    const colors = [
      'linear-gradient(135deg, #4F46E5, #7C3AED)',
      'linear-gradient(135deg, #EE4D2D, #F97316)',
      'linear-gradient(135deg, #00B14F, #10B981)',
      'linear-gradient(135deg, #005BAA, #3B82F6)',
      'linear-gradient(135deg, #1A94FF, #60A5FA)',
      'linear-gradient(135deg, #D0021B, #EF4444)',
    ];
    return colors[((this.job()?.companyId || 1) - 1) % colors.length];
  }

  onApply() {
    const job = this.job();
    const user = this.auth.currentUser();
    if (!job) return;

    if (!user || user.role !== 'student') {
      this.toast.warning('Vui lòng đăng nhập với tài khoản sinh viên để ứng tuyển.');
      this.router.navigate(['/login']);
      return;
    }

    if (user.ekycStatus !== 'verified') {
      this.toast.warning('Bạn cần xác thực danh tính (eKYC) trước khi ứng tuyển.');
      return;
    }

    if (user.blacklistCount !== undefined && user.blacklistCount >= 3) {
      this.toast.error('Tài khoản của bạn đã bị khóa ứng tuyển do vi phạm chính sách của hệ thống (> 3 cảnh cáo).');
      return;
    }

    const deadlineDate = new Date(job.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ignore time
    if (deadlineDate < today) {
      this.toast.error('Công việc này đã hết hạn ứng tuyển.');
      return;
    }

    this.jobService.applyJob(job.id, '').subscribe({
      next: (res) => {
        if (res.success) {
          this.applied.set(true);
          // Optional: this.auth.applyToJob(job.id) if auth service still maintains a local cache
          this.toast.success('Ứng tuyển thành công! Nhà tuyển dụng sẽ liên hệ nếu phù hợp.');
        } else {
          this.toast.error(res.message || 'Bạn đã ứng tuyển công việc này rồi.');
        }
      },
      error: () => this.toast.error('Lỗi kết nối khi ứng tuyển. Vui lòng thử lại.')
    });
  }

  onSubmitEvidence() {
    const job = this.job();
    if (!job || !this.studentEvidenceText) return;

    this.jobService.submitStudentEvidence(job.id, this.studentEvidenceText, this.studentEvidenceUrl).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Đã nộp bằng chứng thành công.');
          // Reload job details to update UI state
          this.jobService.fetchJobDetail(job.id).subscribe(updated => {
            this.job.set(updated);
          });
        } else {
          this.toast.error(res.message || 'Nộp bằng chứng thất bại.');
        }
      },
      error: () => this.toast.error('Lỗi kết nối khi nộp bằng chứng.')
    });
  }

  goBack() {
    if (window.history.length > 1) {
      this.locationService.back();
    } else {
      this.router.navigate(['/jobs']);
    }
  }

  formatAmPm(timeStr: string): string {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}:${m} ${ampm}`;
  }
}
