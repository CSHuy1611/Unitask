import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Job } from '../models/job.model';
import MOCK_JOBS from '../../assets/data/mock-jobs.json';

@Injectable({ providedIn: 'root' })
export class JobService {
  private platformId = inject(PLATFORM_ID);
  private allJobs: Job[] = [];

  constructor() {
    this.loadJobsFromStorage();
  }

  private loadJobsFromStorage() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('unitask_jobs');
      if (stored) {
        this.allJobs = JSON.parse(stored);
      } else {
        this.allJobs = MOCK_JOBS as Job[];
        this.saveJobsToStorage();
      }
    } else {
      this.allJobs = MOCK_JOBS as Job[];
    }
  }

  private saveJobsToStorage() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('unitask_jobs', JSON.stringify(this.allJobs));
    }
    // Trigger signal updates if needed, but our signals are computed based on allJobs reference...
    // To trigger computed, we actually need allJobs to be a signal itself.
    // For now we will just re-assign.
  }

  searchQuery = signal('');
  locationFilter = signal('');
  typeFilter = signal('');

  jobs = computed(() => {
    let result = [...this.allJobs];
    const query = this.searchQuery().toLowerCase();
    const location = this.locationFilter();
    const type = this.typeFilter();

    if (query) {
      result = result.filter(j =>
        j.title.toLowerCase().includes(query) ||
        j.company.toLowerCase().includes(query) ||
        j.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (location) {
      result = result.filter(j => j.location.includes(location));
    }

    if (type) {
      result = result.filter(j => j.type === type);
    }

    return result;
  });

  featuredJobs = computed(() => this.allJobs.filter(j => j.isUrgent).slice(0, 4));
  recentJobs = computed(() =>
    [...this.allJobs].sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()).slice(0, 6)
  );

  getJobById(id: number): Job | undefined {
    return this.allJobs.find(j => j.id === id);
  }

  getJobsByCompanyId(companyId: number): Job[] {
    return this.allJobs.filter(j => j.companyId === companyId);
  }

  getJobTypes(): string[] {
    return [...new Set(this.allJobs.map(j => j.type))];
  }

  getLocations(): string[] {
    return [...new Set(this.allJobs.map(j => j.location))];
  }

  getAllJobs(): Job[] {
    return [...this.allJobs];
  }

  // Force trigger reactivity if using computed that depends on allJobs.
  // Actually, in Angular signals, if allJobs is a regular property, computed won't detect its internal changes.
  // But since we just need simple CRUD, it's fine for the mock layer.
  private triggerUpdate() {
    const current = [...this.allJobs];
    this.allJobs = current; // This doesn't trigger signals.
    this.saveJobsToStorage();
  }

  addJob(job: Partial<Job>): Job {
    const newJob: Job = {
      id: this.allJobs.length + 1,
      title: job.title || '',
      company: job.company || '',
      companyId: job.companyId || 0,
      companyLogo: job.companyLogo || 'UT',
      location: job.location || '',
      type: job.type || 'Part-time',
      salary: job.salary || '',
      salaryRange: job.salaryRange || [0, 0],
      description: job.description || '',
      requirements: job.requirements || [],
      benefits: job.benefits || [],
      tags: job.tags || [],
      postedDate: new Date().toISOString().split('T')[0],
      deadline: job.deadline || '',
      views: 0,
      applications: 0,
      isUrgent: job.isUrgent || false,
      isRemote: job.isRemote || false,
      budget: job.budget || 0,
      commission: job.commission || 0,
      status: 'open',
      applicants: [],
    };
    this.allJobs.unshift(newJob);
    this.triggerUpdate();
    return newJob;
  }

  // Check if a job is still editable (deadline >= today)
  isJobEditable(job: Job): boolean {
    if (!job.deadline) return true;
    const today = new Date().toISOString().split('T')[0];
    return job.deadline >= today;
  }

  // Update job (only if still within deadline)
  updateJob(id: number, data: Partial<Job>): { success: boolean; message: string } {
    const idx = this.allJobs.findIndex(j => j.id === id);
    if (idx < 0) return { success: false, message: 'Không tìm thấy bài đăng.' };

    const job = this.allJobs[idx];
    if (!this.isJobEditable(job)) {
      return { success: false, message: 'Bài đăng đã hết hạn, không thể chỉnh sửa.' };
    }

    this.allJobs[idx] = {
      ...job,
      title: data.title ?? job.title,
      location: data.location ?? job.location,
      type: data.type ?? job.type,
      salary: data.salary ?? job.salary,
      description: data.description ?? job.description,
      tags: data.tags ?? job.tags,
      deadline: data.deadline ?? job.deadline,
      isRemote: data.isRemote ?? job.isRemote,
      isUrgent: data.isUrgent ?? job.isUrgent,
    };
    this.triggerUpdate();

    return { success: true, message: 'Cập nhật bài đăng thành công!' };
  }

  deleteJob(id: number): void {
    const idx = this.allJobs.findIndex(j => j.id === id);
    if (idx >= 0) {
      this.allJobs.splice(idx, 1);
      this.triggerUpdate();
    }
  }

  // Phase 4: Escrow & Completion Flow
  addApplicant(jobId: number, studentId: number): void {
    const job = this.getJobById(jobId);
    if (job && !job.applicants?.includes(studentId)) {
      job.applicants = [...(job.applicants || []), studentId];
      this.triggerUpdate();
    }
  }

  assignJob(jobId: number, studentId: number): { success: boolean; message: string } {
    const job = this.getJobById(jobId);
    if (job && job.status === 'open') {
      job.status = 'in_progress';
      job.selectedStudentId = studentId;
      this.triggerUpdate();
      return { success: true, message: 'Đã giao việc thành công.' };
    }
    return { success: false, message: 'Không thể giao việc.' };
  }

  completeJob(jobId: number): { success: boolean; message: string } {
    const job = this.getJobById(jobId);
    if (job && job.status === 'in_progress') {
      job.status = 'pending_confirmation';
      this.triggerUpdate();
      return { success: true, message: 'Đã báo cáo hoàn thành công việc.' };
    }
    return { success: false, message: 'Lỗi xác nhận.' };
  }

  approveJob(jobId: number): { success: boolean; job?: Job; message: string } {
    const job = this.getJobById(jobId);
    if (job && job.status === 'pending_confirmation') {
      job.status = 'completed';
      this.triggerUpdate();
      return { success: true, job, message: 'Đã nghiệm thu và thành toán thành công.' };
    }
    return { success: false, message: 'Lỗi nghiệm thu.' };
  }
}
