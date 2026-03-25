import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../models/user.model';
import MOCK_USERS from '../../assets/data/mock-users.json';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
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

  login(email: string, password: string): { success: boolean; message: string } {
    const user = this.users.find(u => u.email === email && u.password === password);
    if (user) {
      this.currentUser.set(user);
      this.saveToStorage(user);
      return { success: true, message: 'Đăng nhập thành công!' };
    }
    return { success: false, message: 'Email hoặc mật khẩu không đúng.' };
  }

  logout(): void {
    this.currentUser.set(null);
    this.saveToStorage(null);
  }

  register(userData: Partial<User>): { success: boolean; message: string } {
    const exists = this.users.find(u => u.email === userData.email);
    if (exists) {
      return { success: false, message: 'Email đã được sử dụng.' };
    }

    const newUser: User = {
      id: this.users.length + 1,
      email: userData.email || '',
      password: userData.password || '',
      role: userData.role || 'student',
      fullName: userData.fullName || '',
      avatar: (userData.fullName || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
      phone: userData.phone || '',
      ekycStatus: 'none',
      ekycDate: null,
      createdAt: new Date().toISOString().split('T')[0],
      university: userData.university,
      major: userData.major,
      year: userData.year,
      skills: userData.skills || [],
      bio: userData.bio,
      appliedJobs: [],
      savedJobs: [],
      companyId: userData.companyId,
      companyName: userData.companyName,
      position: userData.position,
      postedJobs: [],
    };

    this.users.push(newUser);
    this.saveUsersToStorage();
    this.currentUser.set(newUser);
    this.saveToStorage(newUser);
    return { success: true, message: 'Đăng ký thành công!' };
  }

  // Profile update
  updateProfile(data: Partial<User>): { success: boolean; message: string } {
    const user = this.currentUser();
    if (!user) return { success: false, message: 'Chưa đăng nhập.' };

    const updated: User = {
      ...user,
      fullName: data.fullName ?? user.fullName,
      phone: data.phone ?? user.phone,
      university: data.university ?? user.university,
      major: data.major ?? user.major,
      year: data.year ?? user.year,
      skills: data.skills ?? user.skills,
      bio: data.bio ?? user.bio,
      address: data.address ?? user.address,
      dateOfBirth: data.dateOfBirth ?? user.dateOfBirth,
      avatar: (data.fullName || user.fullName).split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
    };

    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = updated;
      this.saveUsersToStorage();
    }
    this.currentUser.set(updated);
    this.saveToStorage(updated);
    return { success: true, message: 'Cập nhật hồ sơ thành công!' };
  }

  // CV upload
  uploadCV(fileName: string): void {
    const user = this.currentUser();
    if (user) {
      const updated = { ...user, cvFileName: fileName, cvUploadDate: new Date().toISOString().split('T')[0] };
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx >= 0) {
        this.users[idx] = updated;
        this.saveUsersToStorage();
      }
      this.currentUser.set(updated);
      this.saveToStorage(updated);
    }
  }

  submitEkyc(): void {
    const user = this.currentUser();
    if (user) {
      const updated = { ...user, ekycStatus: 'pending' as const, ekycDate: new Date().toISOString().split('T')[0] };
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx >= 0) {
        this.users[idx] = updated;
        this.saveUsersToStorage();
      }
      this.currentUser.set(updated);
      this.saveToStorage(updated);
    }
  }

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
    const user = this.currentUser();
    if (user) {
      const currentBalance = user.balance || 0;
      if (currentBalance >= amount) {
        const updated = { ...user, balance: currentBalance - amount };
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx >= 0) {
          this.users[idx] = updated;
          this.saveUsersToStorage();
        }
        this.currentUser.set(updated);
        this.saveToStorage(updated);
        return { success: true, message: `Đã trừ ${amount.toLocaleString('vi-VN')}đ` };
      }
      return { success: false, message: 'Số dư không đủ' };
    }
    return { success: false, message: 'Lỗi xác thực' };
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

  approveEkyc(userId: number): void {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], ekycStatus: 'verified', ekycDate: new Date().toISOString().split('T')[0] };
      // If this is the currently logged in user by another session, sync
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
      const current = this.currentUser();
      if (current?.id === userId) {
        this.currentUser.set(this.users[idx]);
        this.saveToStorage(this.users[idx]);
      }
    }
  }
}
