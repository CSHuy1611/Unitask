import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { Job } from '../models/job.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class JobService {
  private http = inject(HttpClient);
  
  // Using Signals for synchronous UI access where needed
  private allJobsSignal = signal<Job[]>([]);

  searchQuery = signal('');
  locationFilter = signal('');
  typeFilter = signal('');

  jobs = computed(() => {
    let result = [...this.allJobsSignal()];
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

  featuredJobs = computed(() => this.allJobsSignal().filter(j => j.isUrgent).slice(0, 4));
  recentJobs = computed(() =>
    [...this.allJobsSignal()].sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()).slice(0, 6)
  );

  constructor() {
    this.fetchJobs();
  }

  fetchJobs() {
    this.http.get<any[]>(`${API_BASE_URL}/job?PageSize=1000`).pipe(
      map(dtos => dtos.map(dto => this.mapDtoToJob(dto)))
    ).subscribe({
      next: (jobs) => {
        this.allJobsSignal.set(jobs);
      },
      error: (err) => console.error('Failed to load jobs:', err)
    });
  }

  private mapDtoToJob(dto: any): Job {
    const statusMap: Record<number, Job['status']> = {
      0: 'open',
      1: 'in_progress',
      2: 'pending_confirmation',
      3: 'completed',
      4: 'disputed',
      5: 'closed'
    };
    
    return {
      id: dto.id,
      title: dto.title,
      company: dto.companyName || '',
      companyId: dto.companyId || 0,
      companyLogo: dto.companyLogoUrl || 'UT',
      location: dto.location || '',
      type: dto.type || 'Part-time',
      category: dto.category || '',
      salary: dto.salaryText || dto.salary || (dto.budget ? Math.round(dto.budget / (dto.headCount || 1)).toLocaleString('vi-VN') + 'đ' : ''),
      salaryRange: dto.salaryRange || [0, 0],
      description: dto.description || '',
      requirements: Array.isArray(dto.requirements) ? dto.requirements : (typeof dto.requirements === 'string' ? dto.requirements.split(/\r?\n|\\n/) : []),
      benefits: Array.isArray(dto.benefits) ? dto.benefits : (typeof dto.benefits === 'string' ? dto.benefits.split(/\r?\n|\\n/) : []),
      tags: typeof dto.tags === 'string' ? dto.tags.split(',') : (dto.tags || []),
      postedDate: dto.postedDate || dto.createdAt || new Date().toISOString(),
      deadline: dto.deadline ? dto.deadline.split('T')[0] : '',
      views: dto.views || 0,
      applications: dto.applicationsCount || 0,
      acceptedCount: dto.acceptedCount || 0,
      isUrgent: dto.isUrgent || false,
      isRemote: dto.isRemote || false,
      budget: dto.budget || 0,
      commission: dto.commission || 0,
      headCount: dto.headCount || 1,
      status: statusMap[dto.status] || 'open',
      applicants: dto.applicants || [],
      selectedStudentId: dto.selectedStudentId,
      companyDescription: dto.companyDescription,
      companyIndustry: dto.companyIndustry,
      companySize: dto.companySize,
      companyLocation: dto.companyLocation,
      companyWebsite: dto.companyWebsite,
      disputeReason: dto.disputeReason,
      employerEvidenceText: dto.employerEvidenceText,
      employerEvidenceUrl: dto.employerEvidenceUrl,
      studentEvidenceText: dto.studentEvidenceText,
      studentEvidenceUrl: dto.studentEvidenceUrl,
      disputedDate: dto.disputedDate ? dto.disputedDate.split('T')[0] : undefined,
      checkInTime: dto.checkInTime,
      checkOutTime: dto.checkOutTime,
      isCompanyPremium: dto.isCompanyPremium || false,
      isAppliedByCurrentUser: dto.isAppliedByCurrentUser || false
    };
  }

  getJobById(id: number): Job | undefined {
    return this.allJobsSignal().find(j => j.id === id);
  }

  fetchJobDetail(id: number): Observable<Job> {
    return this.http.get<any>(`${API_BASE_URL}/job/${id}`).pipe(
      map(dto => this.mapDtoToJob(dto))
    );
  }

  getJobsByCompanyId(companyId: number): Job[] {
    return this.allJobsSignal().filter(j => j.companyId === companyId);
  }

  getJobTypes(): string[] {
    return [...new Set(this.allJobsSignal().map(j => j.type))];
  }

  getLocations(): string[] {
    return [...new Set(this.allJobsSignal().map(j => j.location))];
  }

  getAllJobs(): Job[] {
    return [...this.allJobsSignal()];
  }

  addJob(job: Partial<Job>): Observable<{ success: boolean; message: string }> {
    const payload = {
      title: job.title,
      type: job.type,
      category: job.category || '',
      location: job.location,
      salaryText: job.salary,
      budget: job.budget,
      commission: job.commission,
      deadline: job.deadline,
      description: job.description,
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
      benefits: Array.isArray(job.benefits) ? job.benefits : [],
      tags: Array.isArray(job.tags) ? job.tags : [],
      isRemote: job.isRemote,
      isUrgent: job.isUrgent,
      headCount: job.headCount,
      workStartTime: job.workStartTime ? (job.workStartTime.length === 5 ? job.workStartTime + ':00' : job.workStartTime) : null,
      workEndTime: job.workEndTime ? (job.workEndTime.length === 5 ? job.workEndTime + ':00' : job.workEndTime) : null,
      workDate: job.workDate || null
    };

    return this.http.post<any>(`${API_BASE_URL}/job`, payload).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đăng bài tuyển dụng thành công!' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi kết nối máy chủ.' }))
    );
  }

  isJobEditable(job: Job): boolean {
    if (!job.deadline) return true;
    const today = new Date().toISOString().split('T')[0];
    return job.deadline >= today;
  }

  startJob(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/job/${id}/start`, {}).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đã bắt đầu công việc thành công.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi khi bắt đầu công việc.' }))
    );
  }

  updateJob(id: number, data: Partial<Job>): Observable<{ success: boolean; message: string }> {
    const payload = {
      title: data.title,
      type: data.type,
      category: data.category || '',
      location: data.location,
      salaryText: data.salary,
      budget: data.budget,
      commission: data.commission,
      deadline: data.deadline,
      description: data.description,
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      benefits: Array.isArray(data.benefits) ? data.benefits : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      isRemote: data.isRemote,
      isUrgent: data.isUrgent,
      headCount: data.headCount,
      workStartTime: data.workStartTime ? (data.workStartTime.length === 5 ? data.workStartTime + ':00' : data.workStartTime) : null,
      workEndTime: data.workEndTime ? (data.workEndTime.length === 5 ? data.workEndTime + ':00' : data.workEndTime) : null,
      workDate: data.workDate || null
    };

    return this.http.put<any>(`${API_BASE_URL}/job/${id}`, payload).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Cập nhật bài đăng thành công!' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi cập nhật bài đăng.' }))
    );
  }

  deleteJob(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${API_BASE_URL}/job/${id}`).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đã xóa bài đăng.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Không thể xóa bài đăng này.' }))
    );
  }

  applyJob(jobId: number, coverLetter: string = ''): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/application/${jobId}`, { coverLetter }).pipe(
      tap(() => {
        // Optimistic UI update
        const currentJobs = this.allJobsSignal();
        const updatedJobs = currentJobs.map(j => j.id === jobId ? { ...j, isAppliedByCurrentUser: true } : j);
        this.allJobsSignal.set(updatedJobs);
        this.fetchJobs();
      }),
      map(() => ({ success: true, message: 'Đã ứng tuyển thành công.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Ứng tuyển thất bại. Bạn có thể đã ứng tuyển rồi.' }))
    );
  }

  getJobApplications(jobId: number): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE_URL}/application/job/${jobId}`);
  }

  getMyApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE_URL}/application/my`);
  }

  assignJob(applicationId: number): Observable<{ success: boolean; message: string }> {
    return this.http.put<any>(`${API_BASE_URL}/application/${applicationId}/status`, { status: 2 }).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đã giao việc thành công.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Không thể giao việc.' }))
    );
  }

  completeJob(jobId: number): Observable<{ success: boolean; message: string }> {
    return this.http.put<any>(`${API_BASE_URL}/job/${jobId}/report-completion`, {}).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đã báo cáo hoàn thành công việc.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi báo cáo hoàn thành.' }))
    );
  }

  approveJob(jobId: number): Observable<{ success: boolean; message: string }> {
    return this.http.put<any>(`${API_BASE_URL}/job/${jobId}/approve`, {}).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đã nghiệm thu và thanh toán thành công.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi nghiệm thu. Vui lòng thử lại.' }))
    );
  }

  // Application-level actions (Auto-assign & per-student logic)
  generateApplicationOtp(applicationId: number, type: 'checkin' | 'checkout'): Observable<{ success: boolean; otp?: string; message?: string }> {
    return this.http.post<any>(`${API_BASE_URL}/application/${applicationId}/generate-otp?type=${type}`, {}).pipe(
      map(res => ({ success: true, otp: res.otp })),
      catchError(err => of({ success: false, message: err.error?.message || 'Không thể tạo mã OTP.' }))
    );
  }

  studentCheckInApplication(applicationId: number, otp: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/application/${applicationId}/checkin`, { otp }).pipe(
      tap(() => this.fetchJobs()),
      map(res => ({ success: true, message: res.message })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi Check-in.' }))
    );
  }

  studentCheckOutApplication(applicationId: number, otp: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/application/${applicationId}/checkout`, { otp }).pipe(
      tap(() => this.fetchJobs()),
      map(res => ({ success: true, message: res.message })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi Check-out.' }))
    );
  }

  reportApplicationNoShow(applicationId: number, reason: string, evidenceUrl: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/application/${applicationId}/report-noshow`, { reason, evidenceUrl }).pipe(
      tap(() => this.fetchJobs()),
      map(res => ({ success: true, message: res.message })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi báo cáo vắng mặt.' }))
    );
  }

  approveApplicationCompletion(applicationId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/application/${applicationId}/approve-completion`, {}).pipe(
      tap(() => this.fetchJobs()),
      map(res => ({ success: true, message: res.message })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi nghiệm thu.' }))
    );
  }

  rejectCompletion(jobId: number, reason: string, evidenceText: string = '', evidenceUrl: string = ''): Observable<{ success: boolean; message: string }> {
    return this.http.put<any>(`${API_BASE_URL}/job/${jobId}/reject-completion`, { reason, evidenceText, evidenceUrl }).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đã báo cáo tranh chấp thành công.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi gửi tranh chấp.' }))
    );
  }

  submitStudentEvidence(jobId: number, evidenceText: string, evidenceUrl: string = ''): Observable<{ success: boolean; message: string }> {
    return this.http.put<any>(`${API_BASE_URL}/job/${jobId}/student-evidence`, { evidenceText, evidenceUrl }).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đã nộp bằng chứng chứng minh thành công.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi nộp bằng chứng.' }))
    );
  }

  getDisputes(page: number = 1, pageSize: number = 10): Observable<any> {
    return this.http.get<any>(`${API_BASE_URL}/admin/disputes?page=${page}&pageSize=${pageSize}`);
  }

  resolveDispute(jobId: number, winner: 'Student' | 'Employer'): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/admin/disputes/${jobId}/resolve`, { winner }).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đã giải quyết tranh chấp thành công.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Lỗi giải quyết tranh chấp.' }))
    );
  }

  studentCheckIn(jobId: number, otp: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/job/${jobId}/checkin`, { otp }).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Check-in thành công.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Check-in thất bại.' }))
    );
  }

  studentCheckOut(jobId: number, otp: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/job/${jobId}/checkout`, { otp }).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Check-out thành công. Tiền công đã chuyển vào trạng thái giữ (Escrow).' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Check-out thất bại.' }))
    );
  }

  generateCheckInOtp(jobId: number): Observable<{ success: boolean; otp?: string; message?: string }> {
    return this.http.post<any>(`${API_BASE_URL}/job/${jobId}/checkin-otp`, {}).pipe(
      map(res => ({ success: true, otp: res.otp })),
      catchError(err => of({ success: false, message: err.error?.message || 'Không thể tạo OTP check-in.' }))
    );
  }

  generateCheckOutOtp(jobId: number): Observable<{ success: boolean; otp?: string; message?: string }> {
    return this.http.post<any>(`${API_BASE_URL}/job/${jobId}/checkout-otp`, {}).pipe(
      map(res => ({ success: true, otp: res.otp })),
      catchError(err => of({ success: false, message: err.error?.message || 'Không thể tạo OTP check-out.' }))
    );
  }

  submitReview(jobId: number, userRole: 'student' | 'employer', rating: number, tags: string[], comment: string): Observable<{ success: boolean; message: string }> {
    const endpoint = userRole === 'student' ? 'student' : 'employer';
    return this.http.post<any>(`${API_BASE_URL}/job/${jobId}/review/${endpoint}`, { rating, tags, comment }).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đăng đánh giá thành công.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Không thể đăng đánh giá.' }))
    );
  }

  studentDispute(jobId: number, reason: string, evidenceUrl?: string, evidenceText?: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/job/${jobId}/dispute/student`, { reason, evidenceUrl, evidenceText }).pipe(
      tap(() => this.fetchJobs()),
      map(() => ({ success: true, message: 'Đã gửi khiếu nại thành công. Ban quản trị sẽ xử lý.' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Không thể gửi khiếu nại.' }))
    );
  }
}
