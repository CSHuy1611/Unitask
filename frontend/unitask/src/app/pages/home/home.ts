import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { JobCardComponent } from '../../components/job-card/job-card';
import { JobService } from '../../services/job.service';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, JobCardComponent],
  template: `
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="container hero-content">
        <div class="hero-text animate-fade-in-up">
          <span class="hero-badge">🎓 #1 Nền tảng việc làm cho sinh viên</span>
          <h1 class="hero-title">
            Tìm kiếm <span class="gradient-text">việc làm</span> phù hợp cho sinh viên
          </h1>
          <p class="hero-desc">
            Kết nối sinh viên với hàng nghìn cơ hội thực tập, part-time và freelance từ các doanh nghiệp uy tín hàng đầu Việt Nam.
          </p>
        </div>

        <div class="search-box animate-fade-in-up" style="animation-delay: 0.2s">
          <div class="search-inner">
            <div class="search-field">
              <span class="material-icons-round">search</span>
              <input type="text" placeholder="Tìm kiếm vị trí, kỹ năng..." class="search-input"
                     [value]="searchQuery()"
                     (input)="searchQuery.set($any($event.target).value)">
            </div>
            <div class="search-field">
              <span class="material-icons-round">location_on</span>
              <select class="search-select" (change)="locationFilter.set($any($event.target).value)">
                <option value="">Tất cả địa điểm</option>
                @for (loc of locations; track loc) {
                  <option [value]="loc">{{ loc }}</option>
                }
              </select>
            </div>
            <button class="btn btn-primary btn-lg search-btn" (click)="onSearch()">
              <span class="material-icons-round">search</span> Tìm kiếm
            </button>
          </div>
        </div>

        <div class="hero-stats animate-fade-in-up" style="animation-delay: 0.4s">
          <div class="stat-item">
            <span class="stat-number">10,000+</span>
            <span class="stat-label">Sinh viên</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">500+</span>
            <span class="stat-label">Doanh nghiệp</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">2,000+</span>
            <span class="stat-label">Việc làm</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">98%</span>
            <span class="stat-label">Hài lòng</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Jobs -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <span class="section-badge">🔥 Tuyển dụng gấp</span>
            <h2 class="section-title">Việc làm nổi bật</h2>
          </div>
          <a routerLink="/jobs" class="btn btn-secondary">Xem tất cả <span class="material-icons-round" style="font-size:18px">arrow_forward</span></a>
        </div>
        <div class="jobs-grid">
          @for (job of featuredJobs(); track job.id; let i = $index) {
            <div class="animate-fade-in-up" [style.animation-delay]="i * 0.1 + 's'">
              <app-job-card [job]="job" />
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Why UniTask -->
    <section class="section why-section">
      <div class="container">
        <div class="section-header center">
          <span class="section-badge">✨ Tại sao chọn UniTask?</span>
          <h2 class="section-title">Giải pháp việc làm thông minh</h2>
        </div>
        <div class="features-grid">
          <div class="feature-card glass-card animate-fade-in-up">
            <div class="feature-icon" style="background: linear-gradient(135deg, #4F46E5, #7C3AED)">
              <span class="material-icons-round">verified_user</span>
            </div>
            <h3>Xác thực eKYC</h3>
            <p>Mọi người dùng đều được xác thực danh tính, đảm bảo an toàn và uy tín cho cả sinh viên lẫn doanh nghiệp.</p>
          </div>
          <div class="feature-card glass-card animate-fade-in-up" style="animation-delay:0.1s">
            <div class="feature-icon" style="background: linear-gradient(135deg, #10B981, #059669)">
              <span class="material-icons-round">speed</span>
            </div>
            <h3>Tìm việc nhanh chóng</h3>
            <p>AI gợi ý công việc phù hợp với kỹ năng và lịch học của bạn. Ứng tuyển chỉ trong vài click.</p>
          </div>
          <div class="feature-card glass-card animate-fade-in-up" style="animation-delay:0.2s">
            <div class="feature-icon" style="background: linear-gradient(135deg, #F59E0B, #F97316)">
              <span class="material-icons-round">handshake</span>
            </div>
            <h3>Kết nối uy tín</h3>
            <p>Hợp tác với hàng trăm doanh nghiệp hàng đầu, từ startup đến tập đoàn lớn. Cơ hội thực sự cho sinh viên.</p>
          </div>
          <div class="feature-card glass-card animate-fade-in-up" style="animation-delay:0.3s">
            <div class="feature-icon" style="background: linear-gradient(135deg, #EF4444, #DC2626)">
              <span class="material-icons-round">shield</span>
            </div>
            <h3>Bảo vệ quyền lợi</h3>
            <p>Chống scam, lừa đảo. Hệ thống đánh giá và báo cáo giúp bảo vệ quyền lợi cho tất cả các bên.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Top Companies -->
    <section class="section">
      <div class="container">
        <div class="section-header center">
          <span class="section-badge">🏢 Đối tác</span>
          <h2 class="section-title">Doanh nghiệp hàng đầu</h2>
        </div>
        <div class="companies-grid">
          @for (company of companies; track company.id; let i = $index) {
            <div class="company-card glass-card animate-fade-in-up" [style.animation-delay]="i * 0.1 + 's'">
              <div class="company-logo" [style.background]="company.color">
                {{ company.logo }}
              </div>
              <h4 class="company-name">{{ company.name }}</h4>
              <span class="company-industry">{{ company.industry }}</span>
              <div class="company-meta">
                <span class="badge badge-primary">{{ company.jobsCount }} việc</span>
                <span class="company-rating">⭐ {{ company.rating }}</span>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section cta-section">
      <div class="container">
        <div class="cta-card">
          <div class="cta-content">
            <h2>Sẵn sàng bắt đầu?</h2>
            <p>Đăng ký ngay hôm nay để khám phá hàng nghìn cơ hội việc làm dành riêng cho sinh viên.</p>
          </div>
          <div class="cta-actions">
            <a routerLink="/register" class="btn btn-accent btn-lg">🎓 Tôi là Sinh viên</a>
            <a routerLink="/register" class="btn btn-outline btn-lg">🏢 Tôi là Doanh nghiệp</a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Hero */
    .hero {
      position: relative;
      padding: calc(80px + var(--space-16)) 0 var(--space-16);
      overflow: hidden;
      min-height: 90vh;
      display: flex;
      align-items: center;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 20% 50%, rgba(79, 70, 229, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 50%, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 100%, rgba(245, 158, 11, 0.05) 0%, transparent 50%);
    }

    .hero-content {
      position: relative;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-10);
    }

    .hero-badge {
      display: inline-block;
      padding: var(--space-2) var(--space-5);
      background: var(--bg-glass);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--primary-light);
      margin-bottom: var(--space-4);
    }

    .hero-title {
      font-size: var(--font-size-5xl);
      font-weight: 900;
      line-height: 1.15;
      max-width: 800px;
    }

    .gradient-text {
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-desc {
      font-size: var(--font-size-lg);
      color: var(--text-secondary);
      max-width: 600px;
      line-height: 1.8;
    }

    /* Search */
    .search-box {
      width: 100%;
      max-width: 800px;
    }

    .search-inner {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-3);
      background: var(--bg-card);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-2xl);
    }

    .search-field {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      background: var(--bg-secondary);
      border-radius: var(--radius-xl);
    }

    .search-field .material-icons-round {
      color: var(--text-muted);
      font-size: 20px;
    }

    .search-input, .search-select {
      flex: 1;
      background: none;
      border: none;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    .search-select {
      appearance: none;
      cursor: pointer;
    }

    .search-select option {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    .search-btn {
      flex-shrink: 0;
    }

    /* Stats */
    .hero-stats {
      display: flex;
      align-items: center;
      gap: var(--space-8);
    }

    .stat-item { text-align: center; }
    .stat-number {
      display: block;
      font-size: var(--font-size-2xl);
      font-weight: 800;
      color: var(--text-primary);
    }
    .stat-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }
    .stat-divider {
      width: 1px;
      height: 40px;
      background: var(--border-light);
    }

    /* Section headers */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: var(--space-10);
    }

    .section-header.center {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .section-badge {
      display: inline-block;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--primary-light);
      margin-bottom: var(--space-2);
    }

    .section-title {
      font-size: var(--font-size-3xl);
      font-weight: 800;
    }

    /* Jobs grid */
    .jobs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-6);
    }

    /* Features */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-6);
      margin-top: var(--space-10);
    }

    .feature-card {
      text-align: center;
      padding: var(--space-8);
    }

    .feature-icon {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto var(--space-5);
    }

    .feature-icon .material-icons-round {
      font-size: 28px;
      color: white;
    }

    .feature-card h3 {
      font-size: var(--font-size-lg);
      font-weight: 700;
      margin-bottom: var(--space-3);
    }

    .feature-card p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      line-height: 1.8;
    }

    /* Companies */
    .companies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-6);
      margin-top: var(--space-10);
    }

    .company-card {
      text-align: center;
      padding: var(--space-6);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
    }

    .company-logo {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-lg);
      font-weight: 800;
      color: white;
    }

    .company-name {
      font-size: var(--font-size-sm);
      font-weight: 700;
    }

    .company-industry {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .company-meta {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .company-rating {
      font-size: var(--font-size-xs);
      color: var(--accent);
      font-weight: 600;
    }

    /* CTA */
    .cta-section { padding-bottom: var(--space-24); }

    .cta-card {
      background: var(--primary-gradient);
      border-radius: var(--radius-2xl);
      padding: var(--space-16) var(--space-10);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-8);
    }

    .cta-content h2 {
      font-size: var(--font-size-3xl);
      font-weight: 800;
      margin-bottom: var(--space-3);
    }

    .cta-content p {
      font-size: var(--font-size-lg);
      color: rgba(255,255,255,0.8);
      max-width: 500px;
    }

    .cta-actions {
      display: flex;
      gap: var(--space-4);
      flex-wrap: wrap;
      justify-content: center;
    }

    .cta-actions .btn-outline {
      border-color: white;
      color: white;
    }

    .cta-actions .btn-outline:hover {
      background: white;
      color: var(--primary);
    }

    @media (max-width: 768px) {
      .hero { min-height: auto; padding-top: calc(70px + var(--space-10)); }
      .hero-title { font-size: var(--font-size-3xl); }
      .search-inner { flex-direction: column; }
      .hero-stats { flex-wrap: wrap; gap: var(--space-5); }
      .stat-divider { display: none; }
      .jobs-grid { grid-template-columns: 1fr; }
      .cta-card { padding: var(--space-10) var(--space-6); }
    }
  `]
})
export class HomeComponent {
  private jobService = inject(JobService);
  private companyService = inject(CompanyService);
  private router = inject(Router);

  searchQuery = signal('');
  locationFilter = signal('');
  featuredJobs = this.jobService.featuredJobs;
  companies = this.companyService.getTopCompanies(6);
  locations = this.jobService.getLocations();

  onSearch() {
    this.jobService.searchQuery.set(this.searchQuery());
    this.jobService.locationFilter.set(this.locationFilter());
    this.router.navigate(['/jobs']);
  }
}
