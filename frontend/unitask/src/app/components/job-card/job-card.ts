import { Component, input, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '../../models/job.model';
import { AuthService } from '../../services/auth.service';
import { JobService } from '../../services/job.service';

@Component({
  selector: 'app-job-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/jobs', job().id]" class="job-card glass-card">
      <div class="card-header">
        <div class="company-logo" [style.background]="getLogoGradient()">
          {{ job().companyLogo }}
        </div>
        <div class="card-meta">
          <span class="company-name">{{ job().company }}</span>
          <span class="posted-date">{{ getTimeAgo() }}</span>
        </div>
        @if (job().isUrgent) {
          <span class="badge badge-danger urgent-badge">🔥 Urgent</span>
        }
      </div>

      <h3 class="job-title">{{ job().title }}</h3>

      <div class="job-info">
        <span class="info-item">
          <span class="material-icons-round">location_on</span>
          {{ job().location }}
        </span>
        <span class="info-item">
          <span class="material-icons-round">schedule</span>
          {{ job().type }}
        </span>
        @if (job().isRemote) {
          <span class="info-item remote">
            <span class="material-icons-round">wifi</span>
            Remote
          </span>
        }
      </div>

      <div class="salary">
        <span class="material-icons-round">payments</span>
        {{ job().salary }}
      </div>

      <div class="tags">
        @for (tag of job().tags.slice(0, 3); track tag) {
          <span class="badge badge-primary">{{ tag }}</span>
        }
      </div>

      <div class="card-footer" style="justify-content:space-between; align-items:center">
        <div style="display:flex; gap:16px;">
          <span class="stat">
            <span class="material-icons-round">visibility</span> {{ job().views }}
          </span>
          <span class="stat">
            <span class="material-icons-round">people</span> {{ job().applicants?.length || 0 }} ứng viên
          </span>
        </div>
        
        @if (auth.currentUser()?.role === 'student') {
          <button class="btn btn-primary btn-sm" (click)="applyForJob($event)" [disabled]="hasApplied()">
            {{ hasApplied() ? 'Đã ứng tuyển' : 'Ứng tuyển ngay' }}
          </button>
        }
      </div>
    </a>
  `,
  styles: [`
    .job-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      text-decoration: none;
      color: inherit;
      cursor: pointer;
    }

    .job-card:hover { color: inherit; }

    .card-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .company-logo {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-sm);
      font-weight: 800;
      color: white;
      flex-shrink: 0;
    }

    .card-meta {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .company-name {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-secondary);
    }

    .posted-date {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .urgent-badge { flex-shrink: 0; }

    .job-title {
      font-size: var(--font-size-lg);
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.4;
    }

    .job-info {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .info-item .material-icons-round { font-size: 16px; }

    .info-item.remote { color: var(--success); }

    .salary {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-base);
      font-weight: 700;
      color: var(--accent);
    }

    .salary .material-icons-round { font-size: 20px; }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .card-footer {
      display: flex;
      gap: var(--space-4);
      padding-top: var(--space-3);
      border-top: 1px solid var(--border-light);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .stat .material-icons-round { font-size: 14px; }
  `]
})
export class JobCardComponent {
  job = input.required<Job>();
  auth = inject(AuthService);
  jobService = inject(JobService);

  hasApplied() {
    const user = this.auth.currentUser();
    return user && this.job().applicants?.includes(user.id);
  }

  applyForJob(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    const user = this.auth.currentUser();
    if (!user || user.role !== 'student') {
      alert('Vui lòng đăng nhập với tài khoản sinh viên để ứng tuyển.');
      return;
    }

    if (!this.hasApplied()) {
      this.jobService.addApplicant(this.job().id, user.id);
      alert('Ứng tuyển thành công! Nhà tuyển dụng sẽ liên hệ nếu phù hợp.');
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
    return colors[(this.job().companyId - 1) % colors.length];
  }

  getTimeAgo(): string {
    const now = new Date();
    const posted = new Date(this.job().postedDate);
    const diffDays = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return `${Math.floor(diffDays / 30)} tháng trước`;
  }
}
