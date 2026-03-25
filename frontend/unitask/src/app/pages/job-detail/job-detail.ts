import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';
import { Job } from '../../models/job.model';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (job()) {
      <section class="detail-page">
        <div class="container">
          <a routerLink="/jobs" class="back-link animate-fade-in">
            <span class="material-icons-round">arrow_back</span> Quay lại danh sách
          </a>

          <div class="detail-grid">
            <!-- Main -->
            <div class="detail-main animate-fade-in-up">
              <div class="detail-header glass-card">
                <div class="header-top">
                  <div class="company-logo" [style.background]="getLogoGradient()">
                    {{ job()!.companyLogo }}
                  </div>
                  <div class="header-info">
                    <h1>{{ job()!.title }}</h1>
                    <div class="header-meta">
                      <span class="meta-item">
                        <span class="material-icons-round">business</span>
                        {{ job()!.company }}
                      </span>
                      <span class="meta-item">
                        <span class="material-icons-round">location_on</span>
                        {{ job()!.location }}
                      </span>
                      <span class="meta-item">
                        <span class="material-icons-round">schedule</span>
                        {{ job()!.type }}
                      </span>
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
                  @if (applied()) {
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
            <a routerLink="/jobs" class="btn btn-primary">Quay lại danh sách</a>
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
  auth = inject(AuthService);

  job = signal<Job | null>(null);
  applied = signal(false);
  companyInfo = signal<any>(null);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const found = this.jobService.getJobById(id);
    if (found) {
      this.job.set(found);
      this.applied.set(this.auth.hasApplied(id));
      this.companyInfo.set(this.companyService.getById(found.companyId) || null);
    }
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
    if (job) {
      this.auth.applyToJob(job.id);
      this.applied.set(true);
    }
  }
}
