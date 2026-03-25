import { Component, inject } from '@angular/core';
import { JobCardComponent } from '../../components/job-card/job-card';
import { JobService } from '../../services/job.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [JobCardComponent, FormsModule],
  template: `
    <section class="jobs-page">
      <div class="container">
        <div class="page-header animate-fade-in-up">
          <h1>Tìm kiếm <span class="gradient-text">việc làm</span></h1>
          <p>Khám phá {{ jobService.jobs().length }} cơ hội việc làm phù hợp với bạn</p>
        </div>

        <!-- Filters -->
        <div class="filters glass-card animate-fade-in-up" style="animation-delay:0.1s">
          <div class="filter-row">
            <div class="search-field">
              <span class="material-icons-round">search</span>
              <input type="text" class="form-input" placeholder="Tìm kiếm vị trí, kỹ năng, công ty..."
                     [ngModel]="jobService.searchQuery()"
                     (ngModelChange)="jobService.searchQuery.set($event)">
            </div>
            <div class="filter-field">
              <span class="material-icons-round">location_on</span>
              <select class="form-select"
                      [ngModel]="jobService.locationFilter()"
                      (ngModelChange)="jobService.locationFilter.set($event)">
                <option value="">Tất cả địa điểm</option>
                @for (loc of locations; track loc) {
                  <option [value]="loc">{{ loc }}</option>
                }
              </select>
            </div>
            <div class="filter-field">
              <span class="material-icons-round">work</span>
              <select class="form-select"
                      [ngModel]="jobService.typeFilter()"
                      (ngModelChange)="jobService.typeFilter.set($event)">
                <option value="">Tất cả loại</option>
                @for (type of jobTypes; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </div>
            <button class="btn btn-secondary btn-sm" (click)="clearFilters()">
              <span class="material-icons-round" style="font-size:16px">clear</span> Xóa bộ lọc
            </button>
          </div>
        </div>

        <!-- Results -->
        <div class="results-info">
          <span>Tìm thấy <strong>{{ jobService.jobs().length }}</strong> việc làm</span>
        </div>

        <div class="jobs-grid">
          @for (job of jobService.jobs(); track job.id; let i = $index) {
            <div class="animate-fade-in-up" [style.animation-delay]="(i % 6) * 0.05 + 's'">
              <app-job-card [job]="job" />
            </div>
          } @empty {
            <div class="empty-state glass-card">
              <span class="material-icons-round empty-icon">search_off</span>
              <h3>Không tìm thấy việc làm</h3>
              <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
              <button class="btn btn-primary" (click)="clearFilters()">Xóa bộ lọc</button>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .jobs-page {
      padding: calc(80px + var(--space-10)) 0 var(--space-16);
    }

    .page-header {
      text-align: center;
      margin-bottom: var(--space-8);
    }

    .page-header h1 {
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

    .page-header p {
      color: var(--text-secondary);
    }

    .filters {
      margin-bottom: var(--space-6);
      padding: var(--space-5);
    }

    .filter-row {
      display: flex;
      gap: var(--space-3);
      align-items: center;
      flex-wrap: wrap;
    }

    .search-field {
      flex: 2;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 200px;
    }

    .search-field .material-icons-round {
      color: var(--text-muted);
      font-size: 20px;
      flex-shrink: 0;
    }

    .filter-field {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 160px;
    }

    .filter-field .material-icons-round {
      color: var(--text-muted);
      font-size: 20px;
      flex-shrink: 0;
    }

    .results-info {
      margin-bottom: var(--space-5);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .results-info strong {
      color: var(--primary-light);
    }

    .jobs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-6);
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: var(--space-16);
    }

    .empty-icon {
      font-size: 64px;
      color: var(--text-muted);
      margin-bottom: var(--space-4);
    }

    .empty-state h3 {
      font-size: var(--font-size-xl);
      margin-bottom: var(--space-2);
    }

    .empty-state p {
      color: var(--text-secondary);
      margin-bottom: var(--space-5);
    }

    @media (max-width: 768px) {
      .filter-row { flex-direction: column; }
      .search-field, .filter-field { width: 100%; }
      .jobs-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class JobsComponent {
  jobService = inject(JobService);
  jobTypes = this.jobService.getJobTypes();
  locations = this.jobService.getLocations();

  clearFilters() {
    this.jobService.searchQuery.set('');
    this.jobService.locationFilter.set('');
    this.jobService.typeFilter.set('');
  }
}
