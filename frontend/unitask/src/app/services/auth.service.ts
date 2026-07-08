import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { User } from '../models/user.model';
import MOCK_USERS from '../../assets/data/mock-users.json';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private users: User[] = [];

  currentUser = signal<User | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);
  isStudent = computed(() => this.currentUser()?.role === 'student');
  isEmployer = computed(() => this.currentUser()?.role === 'employer');
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedUsers = localStorage.getItem('unitask_users');
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
      } else {
        this.users = MOCK_USERS as User[];
        this.saveUsersToStorage();
      }

      const storedUser = localStorage.getItem('unitask_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser) as User;
          const idx = this.users.findIndex(u => u.id === user.id);
          if (idx >= 0) {
             this.currentUser.set(this.users[idx]);
          } else {
             this.currentUser.set(user);
          }
          // Live sync wallet balance and profile details from DB
          this.fetchBalance().subscribe();
          this.fetchProfile().subscribe();
        } catch {
          localStorage.removeItem('unitask_user');
        }
      }
    }
  }

  private saveUsersToStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('unitask_users', JSON.stringify(this.users));
    }
  }

  private saveToStorage(user: User | null): void {
    if (isPlatformBrowser(this.platformId)) {
      if (user) {
        localStorage.setItem('unitask_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('unitask_user');
      }
    }
  }

  login(email: string, password: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/account/login`, { email, password }).pipe(
      tap(response => {
        if (response && response.token) {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('unitask_token', response.token);
          }
          // The backend returns Email, FullName, Role, Token in AuthResponseDto.
          // We map it to the frontend's expected format.
          const user: User = {
            id: response.userId || Math.floor(Math.random() * 10000), // Temporary id mapping until full profile fetch
            email: response.email,
            password: '', 
            role: response.role.toLowerCase(), // 'Student' -> 'student'
            fullName: response.fullName,
            avatar: response.fullName.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase(),
            phone: '',
            ekycStatus: 'none',
            ekycDate: null,
            createdAt: new Date().toISOString().split('T')[0],
            skills: [],
            appliedJobs: [],
            savedJobs: [],
            postedJobs: []
          };
          this.currentUser.set(user);
          this.saveToStorage(user);

          // Live sync wallet balance and profile details from DB
          this.fetchBalance().subscribe();
          this.fetchProfile().subscribe();
        }
      }),
      map(() => ({ success: true, message: 'Đăng nhập thành công!' })),
      catchError(err => {
        return of({ success: false, message: this.parseError(err, 'Email hoặc mật khẩu không đúng.') });
      })
    );
  }

  logout(): void {
    this.currentUser.set(null);
    this.saveToStorage(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('unitask_token');
    }
  }

  register(userData: Partial<User>): Observable<{ success: boolean; message: string }> {
    const payload = {
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      phoneNumber: userData.phone,
      role: userData.role === 'student' ? 'Student' : (userData.role === 'employer' ? 'Employer' : 'Admin'),
      // Extended fields
      university: userData.university,
      major: userData.major,
      year: userData.year,
      companyName: userData.companyName,
      position: userData.position,
      taxCode: userData.taxCode
    };

    return this.http.post<any>(`${API_BASE_URL}/account/register`, payload).pipe(
      map(() => ({ success: true, message: 'Vui lòng kiểm tra email để lấy mã OTP.' })),
      catchError(err => {
        // Backend returns "Không thể gửi mã xác nhận. Vui lòng kiểm tra lại địa chỉ Email." when SMTP fails.
        return of({ success: false, message: this.parseError(err, 'Đăng ký thất bại. Vui lòng thử lại.') });
      })
    );
  }

  verifyOtp(email: string, otpCode: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${API_BASE_URL}/account/verify-otp`, { email, otpCode }).pipe(
      map(() => ({ success: true, message: 'Đăng ký thành công! Vui lòng đăng nhập.' })),
      catchError(err => {
        return of({ success: false, message: this.parseError(err, 'Mã OTP không chính xác.') });
      })
    );
  }

  // Profile update
  updateProfile(data: Partial<User>): Observable<{ success: boolean; message: string }> {
    const user = this.currentUser();
    if (!user) return of({ success: false, message: 'Chưa đăng nhập.' });

    const formData = new FormData();
    if (data.fullName) formData.append('FullName', data.fullName);
    if (data.phone) formData.append('PhoneNumber', data.phone);
    if (data.dateOfBirth) formData.append('DateOfBirth', data.dateOfBirth);
    if (data.address) formData.append('Address', data.address);
    if (data.email) formData.append('Email', data.email);

    let endpoint = '/profile/employer';
    if (user.role === 'student') {
      endpoint = '/profile/student';
    } else if (user.role === 'admin') {
      endpoint = '/profile/admin';
    }

    if (user.role === 'student') {
      if (data.university) formData.append('University', data.university);
      if (data.major) formData.append('Major', data.major);
      if (data.year) formData.append('Year', data.year.toString());
      if (data.skills) formData.append('Skills', data.skills.join(', '));
      if (data.bio) formData.append('Bio', data.bio);
    } else if (user.role === 'employer') {
      if (data.companyName) formData.append('CompanyName', data.companyName);
      if (data.position) formData.append('Position', data.position);
      if (data.companyIndustry) formData.append('Industry', data.companyIndustry);
      if (data.companySize) formData.append('Size', data.companySize);
      if (data.companyLocation) formData.append('Location', data.companyLocation);
      if (data.companyDescription) formData.append('Description', data.companyDescription);
      if (data.companyWebsite) formData.append('Website', data.companyWebsite);
      if (data.taxCode) formData.append('TaxCode', data.taxCode);
    }

    return this.http.put<any>(`${API_BASE_URL}${endpoint}`, formData).pipe(
      tap(() => {
        // Optimistically update local state
        const updated = { ...user, ...data };
        this.currentUser.set(updated);
        this.saveToStorage(updated);
      }),
      map(() => ({ success: true, message: 'Cập nhật hồ sơ thành công!' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Cập nhật thất bại.' }))
    );
  }

  upgradeToBusiness(companyName: string, taxCode: string, file: File): Observable<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('CompanyName', companyName);
    formData.append('TaxCode', taxCode);
    formData.append('BusinessLicenseFile', file);

    return this.http.post<any>(`${API_BASE_URL}/profile/employer/upgrade`, formData).pipe(
      tap(() => {
        const user = this.currentUser();
        if (user) {
          const updated = { ...user, employerType: 0, companyName, taxCode };
          this.currentUser.set(updated);
          this.saveToStorage(updated);
        }
      }),
      map(res => ({ success: true, message: res.message || 'Nâng cấp Doanh nghiệp thành công!' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Nâng cấp thất bại.' }))
    );
  }

  // CV upload
  uploadCV(file: File): Observable<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${API_BASE_URL}/profile/student/cv`, formData).pipe(
      tap(res => {
        const user = this.currentUser();
        if (user && res.cvUrl) {
          const updated = { ...user, cvFileName: file.name, cvUploadDate: new Date().toISOString().split('T')[0], cvUrl: res.cvUrl };
          this.currentUser.set(updated);
          this.saveToStorage(updated);
        }
      }),
      map(() => ({ success: true, message: 'Tải CV lên thành công!' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Tải CV thất bại.' }))
    );
  }

  deleteCV(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${API_BASE_URL}/profile/student/cv`).pipe(
      tap(() => {
        const user = this.currentUser();
        if (user) {
          const updated = { ...user, cvFileName: undefined, cvUploadDate: undefined, cvUrl: undefined };
          this.currentUser.set(updated);
          this.saveToStorage(updated);
        }
      }),
      map(() => ({ success: true, message: 'Xóa CV thành công!' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Xóa CV thất bại.' }))
    );
  }

  submitEkyc(frontFile: File, backFile: File, selfieFile: File, cccdNumber?: string, faceDescriptor?: string): Observable<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('FrontImage', frontFile);
    formData.append('BackImage', backFile);
    formData.append('SelfieImage', selfieFile);
    if (cccdNumber) formData.append('CccdNumber', cccdNumber);
    if (faceDescriptor) formData.append('FaceDescriptor', faceDescriptor);
    
    return this.http.post<any>(`${API_BASE_URL}/profile/ekyc`, formData).pipe(
      tap(() => {
        const user = this.currentUser();
        if (user) {
          const updated = {
            ...user,
            ekycStatus: 'verified' as const,
            ekycDate: new Date().toISOString().split('T')[0]
          };
          this.currentUser.set(updated);
          this.saveToStorage(updated);
        }
      }),
      map(() => ({ success: true, message: 'Xác thực eKYC tự động thành công!' }))
    );
  }

  // Payment & Packages
  // Payment & Packages
  addBalance(amount: number): { success: boolean; message: string } {
    const user = this.currentUser();
    if (user) {
      const updated = { ...user, balance: (user.balance || 0) + amount };
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx >= 0) {
        this.users[idx] = updated;
        this.saveUsersToStorage();
      }
      this.currentUser.set(updated);
      this.saveToStorage(updated);
      return { success: true, message: `Nạp thành công ${amount.toLocaleString('vi-VN')}đ` };
    }
    return { success: false, message: 'Lỗi xác thực' };
  }

  fetchBalance(): Observable<number> {
    return this.http.get<any>(`${API_BASE_URL}/wallet`).pipe(
      tap(res => {
        const user = this.currentUser();
        if (user) {
          const updated = { ...user, balance: res.balance, recentTransactions: res.recentTransactions || [] };
          this.currentUser.set(updated);
          this.saveToStorage(updated);
        }
      }),
      map(res => res.balance),
      catchError(() => of(0))
    );
  }

  fetchProfile(): Observable<any> {
    return this.http.get<any>(`${API_BASE_URL}/profile`).pipe(
      tap(res => {
        if (!res) return;
        const user = this.currentUser();
        if (user) {
          const isStudent = user.role === 'student';
          let updated: User;
          
          const mapEkyc = (val: any): User['ekycStatus'] => {
            if (val === 1 || val === '1' || val === 'Pending' || val === 'pending') return 'pending';
            if (val === 2 || val === '2' || val === 'Verified' || val === 'verified') return 'verified';
            if (val === 3 || val === '3' || val === 'Rejected' || val === 'rejected') return 'rejected';
            return 'none';
          };

            if (isStudent) {
              const userObj = res.user || res.User || {};
              const skillsVal = res.skills || res.Skills || '';
              let skillsArray: string[] = [];
              if (typeof skillsVal === 'string') {
                skillsArray = skillsVal.split(',').map((s: string) => s.trim()).filter(Boolean);
              } else if (Array.isArray(skillsVal)) {
                skillsArray = skillsVal;
              }
              
              const dob = res.dateOfBirth || res.DateOfBirth;
              const cvUpload = res.cvUploadDate || res.CvUploadDate;
              const cvUrl = res.cvUrl || res.CvUrl || '';

              updated = {
                ...user,
                id: userObj.id || userObj.Id || user.id,
                fullName: userObj.fullName || userObj.FullName || user.fullName,
                avatarUrl: userObj.avatarUrl || userObj.AvatarUrl || user.avatarUrl || user.avatar,
                phone: userObj.phoneNumber || userObj.PhoneNumber || res.phone || user.phone,
                ekycStatus: mapEkyc(userObj.ekycStatus !== undefined ? userObj.ekycStatus : userObj.EkycStatus),
                ekycDate: userObj.ekycDate || userObj.EkycDate ? (userObj.ekycDate || userObj.EkycDate).split('T')[0] : user.ekycDate,
                ekycFrontImage: userObj.ekycFrontImage || userObj.EkycFrontImage || userObj.ekycFrontImageUrl || userObj.EkycFrontImageUrl || user.ekycFrontImage,
                ekycBackImage: userObj.ekycBackImage || userObj.EkycBackImage || userObj.ekycBackImageUrl || userObj.EkycBackImageUrl || user.ekycBackImage,
                university: res.university || res.University || user.university,
                major: res.major || res.Major || user.major,
                year: res.year || res.Year || user.year,
                gpa: res.gpa || res.GPA || user.gpa,
                skills: skillsArray.length ? skillsArray : user.skills,
                bio: res.bio || res.Bio || user.bio,
                address: res.address || res.Address || user.address,
                dateOfBirth: dob ? dob.split('T')[0] : user.dateOfBirth,
                cvFileName: cvUrl ? cvUrl.substring(cvUrl.lastIndexOf('/') + 1) : user.cvFileName,
                cvUploadDate: cvUpload ? cvUpload.split('T')[0] : user.cvUploadDate,
                cvUrl: cvUrl || user.cvUrl,
                reliabilityScore: res.reliabilityScore !== undefined ? res.reliabilityScore : (res.ReliabilityScore !== undefined ? res.ReliabilityScore : user.reliabilityScore || 100),
                isFlagged: userObj.isFlagged !== undefined ? userObj.isFlagged : (userObj.IsFlagged !== undefined ? userObj.IsFlagged : user.isFlagged),
                flagReason: userObj.flagReason || userObj.FlagReason || user.flagReason
              };
            } else {
              const userObj = res.user || res.User || {};
              const companyObj = res.company || res.Company || {};
              
              updated = {
                ...user,
                id: userObj.id || userObj.Id || user.id,
                fullName: userObj.fullName || userObj.FullName || user.fullName,
                avatarUrl: userObj.avatarUrl || userObj.AvatarUrl || user.avatarUrl || user.avatar,
                phone: userObj.phoneNumber || userObj.PhoneNumber || res.phone || user.phone,
                ekycStatus: mapEkyc(userObj.ekycStatus !== undefined ? userObj.ekycStatus : userObj.EkycStatus),
                ekycDate: userObj.ekycDate || userObj.EkycDate ? (userObj.ekycDate || userObj.EkycDate).split('T')[0] : user.ekycDate,
                ekycFrontImage: userObj.ekycFrontImage || userObj.EkycFrontImage || userObj.ekycFrontImageUrl || userObj.EkycFrontImageUrl || user.ekycFrontImage,
                ekycBackImage: userObj.ekycBackImage || userObj.EkycBackImage || userObj.ekycBackImageUrl || userObj.EkycBackImageUrl || user.ekycBackImage,
                employerType: res.employerType !== undefined ? res.employerType : (res.EmployerType !== undefined ? res.EmployerType : user.employerType),
                companyId: companyObj.id || companyObj.Id || res.companyId || user.companyId,
                companyName: companyObj.name || companyObj.Name || user.companyName,
                companyIndustry: companyObj.industry || companyObj.Industry || user.companyIndustry,
                companySize: companyObj.size || companyObj.Size || user.companySize,
                companyLocation: companyObj.location || companyObj.Location || user.companyLocation,
                companyDescription: companyObj.description || companyObj.Description || user.companyDescription,
                companyWebsite: companyObj.website || companyObj.Website || user.companyWebsite,
                companyLogoUrl: companyObj.logoUrl || companyObj.LogoUrl || user.companyLogoUrl,
                taxCode: companyObj.taxCode || companyObj.TaxCode || user.taxCode,
                position: res.position || res.Position || user.position,
                activePackage: res.activePackage || undefined,
                packageExpiry: res.packageExpiry || undefined,
                businessLicenseUrl: res.businessLicenseUrl || res.BusinessLicenseUrl || user.businessLicenseUrl,
                isBusinessLicenseVerified: res.isBusinessLicenseVerified !== undefined ? res.isBusinessLicenseVerified : (res.IsBusinessLicenseVerified !== undefined ? res.IsBusinessLicenseVerified : user.isBusinessLicenseVerified),
                isFlagged: userObj.isFlagged !== undefined ? userObj.isFlagged : (userObj.IsFlagged !== undefined ? userObj.IsFlagged : user.isFlagged),
                flagReason: userObj.flagReason || userObj.FlagReason || user.flagReason
              };
            }
          this.currentUser.set(updated);
          this.saveToStorage(updated);
        }
      }),
      catchError(err => {
        console.error('Failed to sync profile details:', err);
        return of(null);
      })
    );
  }

  withdraw(amount: number, bank: string, accountNumber: string, accountName: string): Observable<{ success: boolean; message: string }> {
    const payload = {
      amount,
      bank,
      accountNumber,
      accountName
    };
    return this.http.post<any>(`${API_BASE_URL}/wallet/withdraw`, payload).pipe(
      tap(() => {
        // Sync balance from DB after withdrawal
        this.fetchBalance().subscribe();
      }),
      map(() => ({ success: true, message: 'Yêu cầu rút tiền thành công!' })),
      catchError(err => of({ success: false, message: err.error?.message || 'Rút tiền thất bại. Vui lòng thử lại.' }))
    );
  }

  addWorkingJob(studentId: number, jobId: number): void {
    const idx = this.users.findIndex(u => u.id === studentId);
    if (idx >= 0) {
      const user = this.users[idx];
      const workingJobs = [...(user.workingJobs || [])];
      if (!workingJobs.includes(jobId)) {
        workingJobs.push(jobId);
        const updated = { ...user, workingJobs };
        this.users[idx] = updated;
        this.saveUsersToStorage();
        if (this.currentUser()?.id === studentId) {
          this.currentUser.set(updated);
          this.saveToStorage(updated);
        }
      }
    }
  }

  payStudent(studentId: number, amount: number): void {
    const idx = this.users.findIndex(u => u.id === studentId);
    if (idx >= 0) {
      const user = this.users[idx];
      const updated = { ...user, balance: (user.balance || 0) + amount };
      this.users[idx] = updated;
      this.saveUsersToStorage();
      if (this.currentUser()?.id === studentId) {
        this.currentUser.set(updated);
        this.saveToStorage(updated);
      }
    }
  }

  deductBalance(amount: number): { success: boolean; message: string } {
    // Escrow deductions are handled fully on the backend during job creation.
    // We return success to maintain dashboard compatibility and fetch balance immediately after.
    return { success: true, message: 'Tạm trừ số dư' };
  }

  updatePackage(pkgName: string, durationMonths: number): { success: boolean; message: string } {
    const user = this.currentUser();
    if (user) {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + durationMonths);
      
      const updated = { 
        ...user, 
        activePackage: pkgName,
        packageExpiry: expiry.toISOString().split('T')[0]
      };
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx >= 0) this.users[idx] = updated;
      this.currentUser.set(updated);
      this.saveToStorage(updated);
      return { success: true, message: `Đăng ký thành công ${pkgName}` };
    }
    return { success: false, message: 'Lỗi xác thực' };
  }

  applyToJob(jobId: number): void {
    const user = this.currentUser();
    if (user && user.role === 'student') {
      const appliedJobs = [...(user.appliedJobs || [])];
      if (!appliedJobs.includes(jobId)) {
        appliedJobs.push(jobId);
        const updated = { ...user, appliedJobs };
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx >= 0) this.users[idx] = updated;
        this.currentUser.set(updated);
        this.saveToStorage(updated);
      }
    }
  }

  hasApplied(jobId: number): boolean {
    const user = this.currentUser();
    return (user?.appliedJobs || []).includes(jobId);
  }

  // Admin methods
  getAllUsers(): User[] {
    return this.users.filter(u => u.role !== 'admin');
  }

  getUserById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }

  approveEkyc(userId: number): void {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], ekycStatus: 'verified', ekycDate: new Date().toISOString().split('T')[0] };
      this.saveUsersToStorage();
      // If this is the currently logged in user, sync their session
      const current = this.currentUser();
      if (current?.id === userId) {
        this.currentUser.set(this.users[idx]);
        this.saveToStorage(this.users[idx]);
      }
    }
  }

  rejectEkyc(userId: number): void {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], ekycStatus: 'rejected', ekycDate: new Date().toISOString().split('T')[0] };
      this.saveUsersToStorage();
      const current = this.currentUser();
      if (current?.id === userId) {
        this.currentUser.set(this.users[idx]);
        this.saveToStorage(this.users[idx]);
      }
    }
  }

  updateAvatarUrl(file: File): Observable<{ success: boolean; message: string }> {
    const user = this.currentUser();
    if (!user) return of({ success: false, message: 'Chưa đăng nhập.' });

    const formData = new FormData();
    formData.append('AvatarFile', file);
    
    const endpoint = user.role === 'student' ? '/profile/student' : '/profile/employer';
    
    return this.http.put<any>(`${API_BASE_URL}${endpoint}`, formData).pipe(
      tap(() => {
        // Optimistically we assume success and let the user reload or we create a local object URL
        // A complete implementation would re-fetch the user profile here.
      }),
      map(() => ({ success: true, message: 'Cập nhật ảnh đại diện thành công!' })),
      catchError(err => of({ success: false, message: this.parseError(err, 'Cập nhật ảnh thất bại.') }))
    );
  }

  private parseError(err: any, fallbackMessage: string): string {
    if (!err) return fallbackMessage;
    
    // Check for CORS or server downtime
    if (err.status === 0) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra cổng API (5250) đã khởi chạy chưa.';
    }

    if (err.error) {
      // 1. Standard Identity error array
      if (Array.isArray(err.error)) {
        return err.error.map((e: any) => e.description || e.Description || 'Lỗi không xác định.').join(' ');
      }
      
      // 2. ValidationProblemDetails errors dictionary
      if (err.error.errors && typeof err.error.errors === 'object') {
        const errorDict = err.error.errors;
        const messages: string[] = [];
        for (const key in errorDict) {
          if (Object.prototype.hasOwnProperty.call(errorDict, key)) {
            const errs = errorDict[key];
            if (Array.isArray(errs)) {
              messages.push(...errs);
            } else if (typeof errs === 'string') {
              messages.push(errs);
            }
          }
        }
        if (messages.length > 0) {
          return messages.join(' ');
        }
      }
      
      // 3. Custom error object with message property
      if (err.error.message || err.error.Message) {
        return err.error.message || err.error.Message;
      }
      
      // 4. Raw string error
      if (typeof err.error === 'string') {
        return err.error;
      }
    }
    
    if (err.message) {
      return err.message;
    }

    return fallbackMessage;
  }
}
