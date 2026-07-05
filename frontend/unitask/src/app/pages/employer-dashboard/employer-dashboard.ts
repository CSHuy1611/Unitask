import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
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
    <section class="dashboard-page layout-sidebar">
      <div class="container layout-container">
        @if (!auth.isLoggedIn() || !auth.isEmployer()) {
          <div class="auth-required glass-card animate-fade-in-up" style="width: 100%">
            <span class="material-icons-round" style="font-size:64px;color:var(--primary-light)">lock</span>
            <h2>Chỉ dành cho Nhà tuyển dụng</h2>
            <p>Vui lòng đăng nhập bằng tài khoản doanh nghiệp để truy cập dashboard.</p>
            <a routerLink="/login" class="btn btn-primary btn-lg">Đăng nhập</a>
          </div>
        } @else {
          <!-- SIDEBAR -->
          <aside class="dashboard-sidebar animate-fade-in-up">
            <div class="sidebar-card glass-card profile-card">
              <div class="profile-header">
                <div class="avatar" [class.premium-avatar-glow]="isPremiumEmployer()">{{ auth.currentUser()?.fullName?.charAt(0) || 'E' }}</div>
                <div>
                  <h3 style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                    {{ auth.currentUser()?.fullName }}
                    @if (isPremiumEmployer()) {
                      <span class="premium-badge" title="Tài khoản Premium">
                        <span class="material-icons-round" style="font-size: 16px;">workspace_premium</span>
                      </span>
                    }
                  </h3>
                  <span class="role-badge">Nhà tuyển dụng</span>
                </div>
              </div>
              <div class="wallet-info">
                <span class="label">Số dư khả dụng</span>
                <strong class="balance">{{ (auth.currentUser()?.balance || 0).toLocaleString('vi-VN') }}đ</strong>
                @if (auth.currentUser()?.activePackage) {
                  <span class="package-badge"><span class="material-icons-round">stars</span> {{ auth.currentUser()?.activePackage }}</span>
                }
                <div class="wallet-actions">
                  <a routerLink="/pricing" class="btn btn-primary btn-sm full-width"><span class="material-icons-round">add_circle</span> Nạp tiền / Mua gói</a>
                  <button class="btn btn-secondary btn-sm full-width" (click)="showTransactions.set(true)"><span class="material-icons-round">history</span> Lịch sử Giao dịch</button>
                </div>
              </div>
            </div>

            <div class="sidebar-card glass-card p-5">
              <div class="stats-mini">
                <div class="stat-item">
                  <span class="material-icons-round text-primary">work</span>
                  <div>
                    <span class="stat-value">{{ employerJobs().length }}</span>
                    <span class="stat-label">Việc đã đăng</span>
                  </div>
                </div>
                <div class="stat-item">
                  <span class="material-icons-round text-success">visibility</span>
                  <div>
                    <span class="stat-value">{{ totalViews() }}</span>
                    <span class="stat-label">Tổng lượt xem</span>
                  </div>
                </div>
                <div class="stat-item">
                  <span class="material-icons-round text-warning">people</span>
                  <div>
                    <span class="stat-value">{{ totalApplications() }}</span>
                    <span class="stat-label">Tổng ứng viên</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <!-- MAIN PANEL -->
          <main class="dashboard-main">

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

              <form (ngSubmit)="onSubmitForm()" class="compact-form" style="display: flex; flex-direction: column; gap: 24px;">
                
                <!-- Basic Info Section -->
                <div class="form-section" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px;">
                  <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                    <span class="material-icons-round" style="color: var(--primary-light)">info</span> Thông tin cơ bản
                  </h3>
                  
                  <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div class="form-group" style="margin: 0;">
                      <label class="form-label">Tiêu đề công việc <span style="color: #EF4444">*</span></label>
                      <input type="text" class="form-input" placeholder="VD: Frontend Developer Intern" [(ngModel)]="formData.title" name="title" required>
                      @if (formErrors['title']) { <span class="error-text">{{ formErrors['title'] }}</span> }
                    </div>
                    <div class="form-group" style="margin: 0;">
                      <label class="form-label">Danh mục <span style="color: #EF4444">*</span></label>
                      <select class="form-select" [(ngModel)]="formData.category" name="category">
                        <option value="">-- Chọn danh mục --</option>
                        <option>Marketing & Content</option>
                        <option>IT & Công nghệ</option>
                        <option>Hành chính & Nhân sự (Admin/HR)</option>
                        <option>Kinh doanh & Bán hàng</option>
                        <option>Sự kiện & Giải trí</option>
                        <option>Khác</option>
                      </select>
                      @if (formErrors['category']) { <span class="error-text">{{ formErrors['category'] }}</span> }
                    </div>
                  </div>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <div class="form-group" style="margin: 0;">
                      <label class="form-label">Loại hình</label>
                      <select class="form-select" [(ngModel)]="formData.type" name="type">
                        <option>Thực tập</option>
                        <option>Part-time</option>
                        <option>Freelance</option>
                        <option>Full-time</option>
                      </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                      <label class="form-label">Số lượng tuyển <span style="color: #EF4444">*</span></label>
                      <input type="number" class="form-input" [(ngModel)]="formData.headCount" name="headCount" placeholder="VD: 2" min="1" max="100" required>
                      @if (formErrors['headCount']) { <span class="error-text">{{ formErrors['headCount'] }}</span> }
                    </div>
                    <div class="form-group" style="margin: 0;">
                      <label class="form-label">Địa điểm <span style="color: #EF4444">*</span></label>
                      <input type="text" class="form-input" placeholder="VD: TP. Hồ Chí Minh" [(ngModel)]="formData.location" name="location" required>
                      @if (formErrors['location']) { <span class="error-text">{{ formErrors['location'] }}</span> }
                    </div>
                  </div>
                </div>

                <!-- Budget & Timeline Section -->
                <div class="form-section" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px;">
                  <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                    <span class="material-icons-round" style="color: var(--warning)">payments</span> Ngân sách & Hạn nộp
                  </h3>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                      <div class="form-group" style="margin: 0;">
                        <label class="form-label">Mức lương / người (VND) <span style="color: #EF4444">*</span></label>
                        <input type="number" class="form-input" [(ngModel)]="formData.salaryPerPerson" name="salaryPerPerson" placeholder="VD: 150000" min="50000" required>
                        @if (formErrors['salaryPerPerson']) { <span class="error-text">{{ formErrors['salaryPerPerson'] }}</span> }
                      </div>
                      <div class="form-group" style="margin: 0;">
                        <label class="form-label">Hạn nộp hồ sơ <span style="color: #EF4444">*</span></label>
                        <input type="date" class="form-input" [(ngModel)]="formData.deadline" name="deadline">
                        @if (formErrors['deadline']) { <span class="error-text">{{ formErrors['deadline'] }}</span> }
                      </div>
                    </div>
                    
                    <div class="form-group" style="margin: 0; display: flex; flex-direction: column;">
                      <label class="form-label" style="display: flex; justify-content: space-between;">
                        Chi tiết chi phí
                        <span style="font-size: 12px; font-weight: normal; color: var(--text-secondary);">Phí nền tảng: 10%</span>
                      </label>
                      @if (formData.salaryPerPerson && formData.salaryPerPerson > 0) {
                        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 16px; flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--text-secondary); font-size: 0.95rem;">
                            <span>Tổng lương cho {{ formData.headCount || 1 }} người:</span>
                            <strong style="color: var(--success);">{{ getRounded((formData.salaryPerPerson || 0) * (formData.headCount || 1)).toLocaleString('vi-VN') }}đ</strong>
                          </div>
                          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: var(--text-secondary); font-size: 0.95rem;">
                            <span>Phí nền tảng (10%):</span>
                            <strong style="color: var(--warning);">{{ getRounded((formData.salaryPerPerson || 0) * (formData.headCount || 1) * 0.1).toLocaleString('vi-VN') }}đ</strong>
                          </div>
                          <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px dashed rgba(16, 185, 129, 0.3); align-items: center;">
                            <span style="font-weight: 500; color: var(--text-primary);">Tổng thanh toán:</span>
                            <strong style="color: var(--primary-light); font-size: 1.25rem;">{{ (getRounded((formData.salaryPerPerson || 0) * (formData.headCount || 1)) + getRounded((formData.salaryPerPerson || 0) * (formData.headCount || 1) * 0.1)).toLocaleString('vi-VN') }}đ</strong>
                          </div>
                        </div>
                      } @else {
                        <div style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; flex-grow: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-style: italic;">
                          Nhập mức lương / người để xem chi tiết
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- Description Section -->
                <div class="form-section" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px;">
                  <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                    <span class="material-icons-round" style="color: var(--success)">description</span> Mô tả & Yêu cầu
                  </h3>
                  
                  <div class="form-group" style="margin-bottom: 20px;">
                    <label class="form-label">Mô tả công việc <span style="color: #EF4444">*</span></label>
                    <textarea class="form-input" rows="4" [(ngModel)]="formData.description" name="description" placeholder="Mô tả chi tiết công việc..." required></textarea>
                    @if (formErrors['description']) { <span class="error-text">{{ formErrors['description'] }}</span> }
                  </div>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <div class="form-group" style="margin: 0;">
                      <label class="form-label">Yêu cầu công việc</label>
                      <textarea class="form-input" [(ngModel)]="formData.requirementsStr" name="requirementsStr" rows="2" placeholder="Cách nhau bằng dấu phẩy"></textarea>
                    </div>
                    <div class="form-group" style="margin: 0;">
                      <label class="form-label">Quyền lợi</label>
                      <textarea class="form-input" [(ngModel)]="formData.benefitsStr" name="benefitsStr" rows="2" placeholder="Cách nhau bằng dấu phẩy"></textarea>
                    </div>
                    <div class="form-group" style="margin: 0;">
                      <label class="form-label">Tags</label>
                      <textarea class="form-input" [(ngModel)]="formData.tagsStr" name="tags" rows="2" placeholder="Cách nhau bằng dấu phẩy"></textarea>
                    </div>
                  </div>
                </div>

                <!-- Extra Options Section -->
                <div class="form-section" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px 24px;">
                  <div style="display: flex; align-items: center; justify-content: flex-start; gap: 40px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <label class="toggle-switch"><input type="checkbox" [(ngModel)]="formData.isRemote" name="isRemote"><span class="toggle-slider"></span></label>
                      <span style="font-weight: 500; color: var(--text-primary);">Làm việc từ xa (Remote)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <label class="toggle-switch"><input type="checkbox" [(ngModel)]="formData.isUrgent" name="isUrgent" (change)="onUrgentChange($event)"><span class="toggle-slider"></span></label>
                      <span style="font-weight: 500; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                        <span class="material-icons-round" style="color: var(--warning); font-size: 18px;">local_fire_department</span> Tuyển gấp (Urgent)
                      </span>
                      @if (formErrors['isUrgent']) { <span class="error-text" style="margin: 0;">{{ formErrors['isUrgent'] }}</span> }
                    </div>
                  </div>
                </div>

                <div class="form-actions" style="margin-top: 8px;">
                  <button type="button" class="btn btn-secondary" (click)="closeForm()" style="min-width: 120px;">Hủy</button>
                  <button type="submit" class="btn btn-primary" style="min-width: 160px; font-weight: 600;">
                    <span class="material-icons-round">{{ editingJobId() ? 'save' : 'publish' }}</span>
                    {{ editingJobId() ? 'Lưu thay đổi' : 'Đăng tuyển' }}
                  </button>
                </div>
              </form>
            </div>

            @if (showFreeTierConfirm()) {
              <div class="modal-overlay animate-fade-in">
                <div class="modal-content glass-card p-6" style="width: 100%; max-width: 500px; text-align: center;">
                  <span class="material-icons-round text-warning" style="font-size: 48px; margin-bottom: 16px;">campaign</span>
                  <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Xác nhận đăng tin</h3>
                  <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 24px; text-align: left;">
                    <p style="margin-bottom: 8px; color: var(--text-secondary);">Bạn đang sử dụng <strong style="color:var(--text-primary)">Lượt đăng tin thông thường</strong>:</p>
                    <ul style="padding-left: 20px; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 12px;">
                      <li>Phí đăng bài: <strong style="color:var(--warning)">2,000đ / bài</strong>.</li>
                      <li>Tính năng tuyển gấp: <strong style="color:#EF4444">Không hỗ trợ</strong>.</li>
                    </ul>
                    <div style="padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px dashed rgba(16, 185, 129, 0.3);">
                      <p style="color: #34D399; font-size: 0.85rem; font-weight: 500; margin: 0;">
                        💡 <strong>Đề xuất:</strong> Nâng cấp Gói dịch vụ (chỉ từ 19,000đ/tháng) để MIỄN PHÍ hoàn toàn phí đăng tin, mở khóa Tuyển gấp và nhiều tính năng khác!
                      </p>
                    </div>
                  </div>
                  <div class="d-flex gap-3 justify-center">
                    <button class="btn btn-secondary" (click)="showFreeTierConfirm.set(false)">Quay lại</button>
                    <button class="btn btn-primary" (click)="executePostJob()">Tiếp tục đăng (-2,000đ)</button>
                  </div>
                  <div style="margin-top: 16px;">
                    <a (click)="openPackagesModal()" style="color: var(--primary-light); font-size: 0.9rem; text-decoration: underline; cursor: pointer;">
                      Xem các gói dịch vụ
                    </a>
                  </div>
                </div>
              </div>
            }

            @if (showPackagesModal()) {
              <div class="modal-overlay animate-fade-in">
                <div class="modal-content glass-card p-6" style="width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="font-size: 1.5rem; font-weight: 700;">Nâng cấp Gói Dịch Vụ</h3>
                    <button class="btn btn-secondary btn-sm" (click)="showPackagesModal.set(false)" style="padding: 4px; border-radius: 50%;">
                      <span class="material-icons-round">close</span>
                    </button>
                  </div>
                  
                  <div style="margin-bottom: 24px; padding: 16px; background: rgba(79, 70, 229, 0.1); border-radius: 12px; border: 1px solid rgba(79, 70, 229, 0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <span style="color: var(--text-secondary); display: block;">Số dư ví hiện tại:</span>
                        <strong style="font-size: 1.2rem; color: var(--text-primary);">{{ (auth.currentUser()?.balance || 0).toLocaleString('vi-VN') }}đ</strong>
                      </div>
                      <button class="btn btn-success btn-sm" (click)="testDeposit()" [disabled]="isProcessingPackage()">
                        <span class="material-icons-round">add_circle</span> Nạp 500k (Test)
                      </button>
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                    @for (pkg of packages(); track pkg.id) {
                      <div style="padding: 20px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); text-align: center; display: flex; flex-direction: column;">
                        <h4 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">{{ pkg.name }}</h4>
                        <div style="margin-bottom: 12px;">
                          <span style="font-size: 1.5rem; font-weight: 800; color: var(--primary-light);">{{ pkg.price.toLocaleString('vi-VN') }}đ</span>
                          <span style="font-size: 0.85rem; color: var(--text-muted);">/ {{ pkg.duration }}</span>
                        </div>
                        <ul style="list-style: none; padding: 0; margin: 0 0 16px 0; text-align: left; font-size: 0.85rem; color: var(--text-secondary); flex-grow: 1;">
                          <li style="margin-bottom: 4px; display: flex; gap: 4px;"><span class="material-icons-round" style="font-size: 14px; color: var(--success);">check</span> Đăng không giới hạn tin</li>
                          @if (pkg.id >= 2) { <li style="margin-bottom: 4px; display: flex; gap: 4px;"><span class="material-icons-round" style="font-size: 14px; color: var(--success);">check</span> Ưu tiên hiển thị top</li> }
                        </ul>
                        <button class="btn full-width" [class.btn-primary]="pkg.id === 2" [class.btn-secondary]="pkg.id !== 2" (click)="buyPackage(pkg)" [disabled]="isProcessingPackage()">
                          Mua gói
                        </button>
                      </div>
                    }
                  </div>
                  <div style="margin-top: 24px; text-align: center;">
                    <button class="btn btn-secondary" (click)="showPackagesModal.set(false); showFreeTierConfirm.set(true)">Quay lại xác nhận đăng tin</button>
                  </div>
                </div>
              </div>
            }
          } @else {

          <!-- Jobs list -->
          <div class="jobs-section animate-fade-in-up" style="animation-delay:0.2s">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
              <h2 style="margin: 0;">Việc đã đăng</h2>
              <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; flex: 1; justify-content: flex-end;">
                <div style="position: relative; flex: 1; max-width: 400px;">
                  <span class="material-icons-round" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px;">search</span>
                  <input type="text" class="form-input" style="padding-left: 36px; height: 42px; background: rgba(255,255,255,0.05); width: 100%;" placeholder="Tìm kiếm công việc..." [ngModel]="searchKeyword()" (ngModelChange)="searchKeyword.set($event); currentPage.set(1)">
                </div>
                <select class="form-select" [ngModel]="sortOrder()" (ngModelChange)="sortOrder.set($event); currentPage.set(1)" style="min-width: 150px; background-color: rgba(255,255,255,0.05); height: 42px; color: var(--text-primary); width: auto;">
                  <option value="newest" style="background-color: #0F172A; color: #F8FAFC;">Mới nhất</option>
                  <option value="oldest" style="background-color: #0F172A; color: #F8FAFC;">Cũ nhất</option>
                </select>
                <button class="btn btn-primary" style="height: 42px;" (click)="openNewForm()">
                  <span class="material-icons-round">add</span> Đăng việc mới
                </button>
              </div>
            </div>
            <div class="jobs-table">
              @for (job of filteredAndPagedJobs(); track job.id) {
                <div class="job-row glass-card" [class.job-expired]="!jobService.isJobEditable(job)" style="display: flex; flex-direction: column; align-items: stretch; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 16px;">
                    <div class="job-info">
                      <div class="job-title-row">
                        <a [routerLink]="['/jobs', job.id]" class="job-title-link" style="display: flex; align-items: center; gap: 6px;">
                          {{ job.title }}
                          @if (job.isCompanyPremium) {
                            <span class="premium-badge" title="Tin tuyển dụng Premium" style="padding: 2px 6px;">
                              <span class="material-icons-round" style="font-size: 14px; margin-right: 2px;">workspace_premium</span>
                              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Premium</span>
                            </span>
                          }
                        </a>
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
                      <span class="stat-mini" title="Số sinh viên đã được giao việc">
                        <span class="material-icons-round">person_check</span> Đã giao: {{ job.acceptedCount || 0 }}/{{ job.headCount || 1 }}
                      </span>
                      @if (job.status !== 'open') {
                        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:8px">
                          @if (job.status === 'in_progress') {
                            <span class="badge badge-warning" style="padding: 6px 12px; font-size: 13px;">Đang thực hiện</span>
                          } @else if (job.status === 'pending_confirmation') {
                            <span class="badge badge-info" style="padding: 6px 12px; font-size: 13px;">Chờ xác nhận</span>
                          } @else if (job.status === 'completed') {
                            <span class="badge badge-success" style="padding: 6px 12px; font-size: 13px;">✓ Đã hoàn thành</span>
                          } @else if (job.status === 'disputed') {
                            <span class="badge badge-warning" style="padding: 6px 12px; font-size: 13px; background: rgba(239,68,68,0.15); color: #EF4444;">Đang tranh chấp</span>
                          } @else if (job.status === 'closed') {
                            <span class="badge badge-secondary" style="padding: 6px 12px; font-size: 13px;">Đã đóng</span>
                          }

                          <button class="btn btn-primary btn-sm" (click)="viewApplicants(job)">
                            <span class="material-icons-round" style="font-size:16px; margin-right:4px;">group</span> Danh sách sinh viên ({{ job.applications || 0 }}/{{ job.headCount || 1 }})
                          </button>

                          @if (job.status === 'completed') {
                            <button class="btn btn-secondary btn-sm" (click)="openReviewModal(job)">
                              <span class="material-icons-round" style="font-size:16px; margin-right:4px;">rate_review</span> Đánh giá
                            </button>
                          }
                        </div>
                      } @else {
                        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:8px">
                          <button class="btn btn-primary btn-sm" (click)="viewApplicants(job)">
                            <span class="material-icons-round" style="font-size:16px; margin-right:4px;">group</span> Danh sách sinh viên ({{ job.applications || 0 }}/{{ job.headCount || 1 }})
                          </button>
                          @if (jobService.isJobEditable(job)) {
                            <button class="btn btn-secondary btn-sm" (click)="onEditJob(job)">
                              <span class="material-icons-round" style="font-size:16px; margin-right:4px;">edit</span> Sửa
                            </button>
                          }
                        </div>
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
            
            <div class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px;">
              <button class="btn btn-secondary btn-sm" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)">
                <span class="material-icons-round">chevron_left</span> Trang trước
              </button>
              
              @for (page of getPagesArray(); track page) {
                <button class="btn btn-sm" 
                        [class.btn-primary]="currentPage() === page" 
                        [class.btn-secondary]="currentPage() !== page" 
                        (click)="goToPage(page)"
                        style="min-width: 36px;">
                  {{ page }}
                </button>
              }
              
              <button class="btn btn-secondary btn-sm" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)">
                Trang sau <span class="material-icons-round">chevron_right</span>
              </button>
            </div>
          </div>
          }

          <!-- Applicants Modal -->
          @if (selectedJobForApplicants()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 1000px; max-height: 85vh; overflow-y: auto;">
                <div class="modal-header d-flex justify-between items-center mb-6">
                  <h3 style="font-size:1.5rem; font-weight:700">Danh sách ứng viên: {{ selectedJobForApplicants()?.title }}</h3>
                  <button class="btn btn-secondary icon-btn" (click)="selectedJobForApplicants.set(null)">
                    <span class="material-icons-round">close</span>
                  </button>
                </div>
                
                <div class="applicants-list d-flex flex-col gap-4">
                  @for (app of jobApplications(); track app.id) {
                    <div class="applicant-card p-5 rounded-lg" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.3s ease; border-radius: 12px; display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
                      
                      <!-- Left Column: Student Info & Academic -->
                      <div style="flex: 1; min-width: 350px; display: flex; flex-direction: column; gap: 20px;">
                        
                        <!-- Header: Avatar & Name -->
                        <div class="d-flex items-center gap-4">
                          <div style="position: relative;">
                            <div style="width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--primary-light)); display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:1.75rem; overflow:hidden; border: 3px solid rgba(255,255,255,0.1); box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);">
                              @if (app.studentAvatarUrl) {
                                <img [src]="app.studentAvatarUrl" alt="Avatar" style="width:100%; height:100%; object-fit:cover" />
                              } @else {
                                {{ app.studentName ? app.studentName[0] : 'U' }}
                              }
                            </div>
                            @if (app.studentEkycStatus === 'Verified' || app.studentEkycStatus === 'verified') {
                              <div style="position: absolute; bottom: 0; right: -4px; background: var(--bg-card); border-radius: 50%; padding: 2px;">
                                <span class="material-icons-round" style="font-size:22px; color:var(--success); background: white; border-radius: 50%;" title="Đã định danh eKYC">verified</span>
                              </div>
                            }
                          </div>
                          <div style="flex: 1;">
                            <h4 style="color:var(--text-primary); font-size:1.35rem; font-weight: 700; margin: 0 0 4px 0;">{{ app.studentName }}</h4>
                            <div style="display: flex; align-items: center; gap: 6px; font-size:0.95rem; color:var(--text-secondary);">
                              <span class="material-icons-round" style="font-size:18px; color: var(--primary-light);">school</span>
                              <span>{{ app.studentUniversity }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- Info Grid: Major, Year, GPA -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
                          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
                            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Chuyên ngành</span>
                            <span style="font-size: 0.95rem; color: var(--text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" [title]="app.studentMajor">{{ app.studentMajor || 'Chưa cập nhật' }}</span>
                          </div>
                          
                          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
                            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Sinh viên</span>
                            <span style="font-size: 0.95rem; color: var(--text-primary); font-weight: 500;">Năm thứ {{ app.studentYear || '?' }}</span>
                          </div>

                          <div style="background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.15); padding: 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px;">
                            <span style="font-size: 0.8rem; color: rgba(245,158,11,0.8); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Điểm GPA</span>
                            <div style="display: flex; align-items: baseline; gap: 4px;">
                              <span style="font-size: 1.1rem; color: var(--warning); font-weight: 700;">{{ app.studentGpa ? app.studentGpa.toFixed(2) : '--' }}</span>
                              <span style="font-size: 0.85rem; color: rgba(245,158,11,0.6);">/ 4.00</span>
                            </div>
                          </div>
                        </div>

                        <!-- Bio Blockquote -->
                        @if (app.studentBio) {
                          <div style="position: relative; padding: 16px 20px; background: linear-gradient(90deg, rgba(var(--primary-rgb), 0.08), transparent); border-left: 4px solid var(--primary-light); border-radius: 0 8px 8px 0;">
                            <span class="material-icons-round" style="position: absolute; top: -10px; left: 10px; font-size: 24px; color: var(--primary-light); opacity: 0.5; background: var(--bg-card); padding: 0 4px;">format_quote</span>
                            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin: 0; font-style: italic;">
                              {{ app.studentBio }}
                            </p>
                          </div>
                        }

                        <!-- Skills Tags -->
                        @if (app.studentSkills && app.studentSkills.length > 0) {
                          <div class="d-flex gap-2 items-center" style="flex-wrap:wrap; margin-top: auto;">
                            @for (skill of app.studentSkills; track skill) {
                              <span style="font-size:0.85rem; background: rgba(255,255,255,0.08); color: var(--text-primary); padding: 6px 14px; border-radius: 20px; font-weight: 500; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                {{ skill }}
                              </span>
                            }
                          </div>
                        }

                      </div>

                      <!-- Right Column: Status & Actions -->
                      <div style="width: 320px; min-width: 280px; display: flex; flex-direction: column; gap: 10px;">

                        <!-- Status Badge (top) -->
                        <div>
                          @if (app.status == 2 || app.status === 'Accepted' || app.status === 'accepted') {
                            <div style="display: flex; align-items: center; gap: 8px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 10px; padding: 10px 16px;">
                              <span class="material-icons-round" style="font-size: 20px; color: var(--warning);">work</span>
                              <span style="font-size: 0.95rem; font-weight: 700; color: var(--warning);">Đang thực hiện</span>
                            </div>
                          } @else if (app.status == 5 || app.status === 'Completed' || app.status === 'completed') {
                            <div style="display: flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 10px; padding: 10px 16px;">
                              <span class="material-icons-round" style="font-size: 20px; color: var(--success);">check_circle</span>
                              <span style="font-size: 0.95rem; font-weight: 700; color: var(--success);">Đã nghiệm thu</span>
                            </div>
                          } @else if (app.status == 6 || app.status === 'NoShow' || app.status === 'noshow') {
                            <div style="display: flex; align-items: center; gap: 8px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 10px; padding: 10px 16px;">
                              <span class="material-icons-round" style="font-size: 20px; color: #EF4444;">person_off</span>
                              <span style="font-size: 0.95rem; font-weight: 700; color: #EF4444;">Đã bùng kèo</span>
                            </div>
                          } @else if (app.status == 7 || app.status === 'Disputed' || app.status === 'disputed') {
                            <div style="display: flex; align-items: center; gap: 8px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 10px; padding: 10px 16px;">
                              <span class="material-icons-round" style="font-size: 20px; color: #EF4444;">gavel</span>
                              <span style="font-size: 0.95rem; font-weight: 700; color: #EF4444;">Đang tranh chấp</span>
                            </div>
                          } @else if (app.status == 0 || app.status === 'Applied' || app.status === 'applied') {
                            <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 16px;">
                              <span class="material-icons-round" style="font-size: 20px; color: var(--text-secondary);">hourglass_empty</span>
                              <span style="font-size: 0.95rem; font-weight: 700; color: var(--text-secondary);">Chờ duyệt</span>
                            </div>
                          } @else if (app.status == 1 || app.status === 'Interviewing' || app.status === 'interviewing') {
                            <div style="display: flex; align-items: center; gap: 8px; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.25); border-radius: 10px; padding: 10px 16px;">
                              <span class="material-icons-round" style="font-size: 20px; color: #3B82F6;">record_voice_over</span>
                              <span style="font-size: 0.95rem; font-weight: 700; color: #3B82F6;">Đang phỏng vấn</span>
                            </div>
                          } @else if (app.status == 3 || app.status === 'Rejected' || app.status === 'rejected') {
                            <div style="display: flex; align-items: center; gap: 8px; background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.15); border-radius: 10px; padding: 10px 16px;">
                              <span class="material-icons-round" style="font-size: 20px; color: #EF4444;">do_not_disturb_alt</span>
                              <span style="font-size: 0.95rem; font-weight: 700; color: #EF4444;">Đã từ chối</span>
                            </div>
                          } @else if (app.status == 4 || app.status === 'Cancelled' || app.status === 'cancelled') {
                            <div style="display: flex; align-items: center; gap: 8px; background: rgba(156,163,175,0.06); border: 1px solid rgba(156,163,175,0.2); border-radius: 10px; padding: 10px 16px;">
                              <span class="material-icons-round" style="font-size: 20px; color: #9CA3AF;">block</span>
                              <span style="font-size: 0.95rem; font-weight: 700; color: #9CA3AF;">Đã hủy</span>
                            </div>
                          }
                        </div>

                        <!-- Check-in / Check-out Timeline (shown if exists) -->
                        @if (app.checkInTime || app.checkOutTime) {
                          <div style="background: rgba(16,185,129,0.04); border: 1px solid rgba(16,185,129,0.12); border-radius: 10px; padding: 12px 16px;">
                            <div style="font-size: 0.8rem; color: rgba(16,185,129,0.7); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Lịch sử điểm danh</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                              <div style="display: flex; flex-direction: column; gap: 4px;">
                                <div style="display: flex; align-items: center; gap: 5px; color: var(--success); font-size: 0.85rem; font-weight: 600;">
                                  <span class="material-icons-round" style="font-size: 16px;">login</span>
                                  <span>Check-in</span>
                                </div>
                                <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: 500; padding-left: 2px;">
                                  {{ app.checkInTime ? (app.checkInTime | date:'HH:mm') : '--:--' }}
                                </span>
                                <span style="font-size: 0.8rem; color: var(--text-muted); padding-left: 2px;">
                                  {{ app.checkInTime ? (app.checkInTime | date:'dd/MM/yyyy') : '' }}
                                </span>
                              </div>
                              <div style="display: flex; flex-direction: column; gap: 4px; border-left: 1px solid rgba(16,185,129,0.1); padding-left: 10px;">
                                <div style="display: flex; align-items: center; gap: 5px; color: var(--success); font-size: 0.85rem; font-weight: 600;">
                                  <span class="material-icons-round" style="font-size: 16px;">logout</span>
                                  <span>Check-out</span>
                                </div>
                                <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: 500; padding-left: 2px;">
                                  {{ app.checkOutTime ? (app.checkOutTime | date:'HH:mm') : '--:--' }}
                                </span>
                                <span style="font-size: 0.8rem; color: var(--text-muted); padding-left: 2px;">
                                  {{ app.checkOutTime ? (app.checkOutTime | date:'dd/MM/yyyy') : '' }}
                                </span>
                              </div>
                            </div>
                          </div>
                        }

                        <!-- Action Buttons -->
                        <div style="display: flex; flex-direction: column; gap: 10px;">

                          <!-- View CV button (always show if exists) -->
                          @if (app.studentCVUrl) {
                            <a [href]="app.studentCVUrl" target="_blank"
                               style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; background: rgba(var(--primary-rgb), 0.08); color: var(--primary-light); border: 1px solid rgba(var(--primary-rgb), 0.2); border-radius: 10px; font-size: 0.95rem; font-weight: 600; text-decoration: none; transition: all 0.2s; cursor: pointer;">
                              <span class="material-icons-round" style="font-size: 18px;">description</span>
                              Xem CV ứng viên
                            </a>
                          }

                          <!-- Status-specific action buttons -->
                          @if (app.status == 2 || app.status === 'Accepted' || app.status === 'accepted') {
                            <!-- Check-in / Check-out side by side -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                              <button (click)="generateAppOtp(app, 'checkin')"
                                      style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 12px 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: var(--text-primary); font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                <span class="material-icons-round" style="font-size: 22px; color: var(--success);">login</span>
                                Check-in
                              </button>
                              <button (click)="generateAppOtp(app, 'checkout')"
                                      style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 12px 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: var(--text-primary); font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                <span class="material-icons-round" style="font-size: 22px; color: var(--warning);">logout</span>
                                Check-out
                              </button>
                            </div>
                            <!-- Approve -->
                            <button (click)="appToApprove.set(app)"
                                    style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; background: white; color: #111; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                              <span class="material-icons-round" style="font-size: 20px;">verified</span>
                              Nghiệm thu công việc
                            </button>
                            <!-- Report violation -->
                            <button (click)="appToDispute.set(app)"
                                    style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; background: transparent; color: #EF4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                              <span class="material-icons-round" style="font-size: 18px;">report_problem</span>
                              Báo cáo vi phạm
                            </button>

                          } @else if (app.status == 0 || app.status === 'Applied' || app.status === 'applied') {
                            <!-- Assign job -->
                            <button (click)="userToAssign.set(app.id)"
                                    style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; background: var(--primary-gradient); color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.35); transition: all 0.2s; width: 100%;">
                              <span class="material-icons-round" style="font-size: 20px;">person_add</span>
                              Giao việc cho ứng viên
                            </button>

                          } @else if (app.status == 1 || app.status === 'Interviewing' || app.status === 'interviewing') {
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 100px; background: rgba(59,130,246,0.05); border: 1px dashed rgba(59,130,246,0.25); border-radius: 10px; padding: 16px;">
                              <span class="material-icons-round" style="font-size: 28px; color: rgba(59,130,246,0.6);">schedule</span>
                              <span style="font-size: 0.9rem; color: #3B82F6; font-weight: 500; text-align: center;">Đang trong giai đoạn<br>phỏng vấn</span>
                            </div>

                          } @else if (app.status == 3 || app.status === 'Rejected' || app.status === 'rejected') {
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 100px; background: rgba(239,68,68,0.02); border: 1px dashed rgba(239,68,68,0.15); border-radius: 10px; padding: 16px;">
                              <span class="material-icons-round" style="font-size: 28px; color: rgba(239,68,68,0.5);">do_not_disturb_alt</span>
                              <span style="font-size: 0.9rem; color: #EF4444; font-weight: 500; text-align: center;">Hồ sơ không phù hợp</span>
                              <span style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">Hệ thống tự từ chối khi<br>công việc đủ ứng viên</span>
                            </div>

                          } @else if (app.status == 4 || app.status === 'Cancelled' || app.status === 'cancelled') {
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 100px; background: rgba(156,163,175,0.03); border: 1px dashed rgba(156,163,175,0.2); border-radius: 10px; padding: 16px;">
                              <span class="material-icons-round" style="font-size: 28px; color: rgba(156,163,175,0.5);">block</span>
                              <span style="font-size: 0.9rem; color: #9CA3AF; font-weight: 500; text-align: center;">Ứng viên đã tự hủy<br>ứng tuyển</span>
                            </div>

                          } @else if (app.status == 5 || app.status === 'Completed' || app.status === 'completed') {
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 80px; background: rgba(16,185,129,0.04); border: 1px solid rgba(16,185,129,0.15); border-radius: 10px; padding: 16px;">
                              <span class="material-icons-round" style="font-size: 28px; color: var(--success);">task_alt</span>
                              <span style="font-size: 0.9rem; color: var(--success); font-weight: 600; text-align: center;">Công việc hoàn thành</span>
                            </div>
                          }

                        </div>
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

          <!-- Confirm Approve App Modal -->
          @if (appToApprove()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 450px; text-align: center;">
                <span class="material-icons-round" style="font-size:64px; color:var(--success); margin-bottom:16px">payments</span>
                <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Xác nhận nghiệm thu Sinh viên</h3>
                <p style="color:var(--text-secondary); margin-bottom:24px">Bạn xác nhận nghiệm thu công việc này cho <strong>{{ appToApprove()?.studentName }}</strong>? Hệ thống sẽ giải ngân phần tiền công tương ứng cho sinh viên này.</p>
                <div class="form-actions d-flex justify-center gap-3">
                  <button class="btn btn-secondary" (click)="appToApprove.set(null)">Hủy</button>
                  <button class="btn btn-success" (click)="approveApplicationCompletion(appToApprove()!)">Nghiệm thu & Trả lương</button>
                </div>
              </div>
            </div>
          }

          <!-- Dispute App Modal -->
          @if (appToDispute()) {
            <div class="modal-overlay animate-fade-in">
              <div class="modal-content glass-card p-6" style="width: 100%; max-width: 500px; text-align: left;">
                <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Báo cáo Vi phạm / Khiếu nại</h3>
                <p style="color:var(--text-secondary); margin-bottom:16px">Ghi nhận vi phạm đối với sinh viên <strong>{{ appToDispute()?.studentName }}</strong>. Sinh viên sẽ bị trừ Điểm tín nhiệm tùy theo mức độ vi phạm.</p>
                
                <div class="form-group mb-4">
                  <label class="form-label" style="display:block; margin-bottom:6px">Lý do vi phạm *</label>
                  <select class="form-input" style="width:100%" [(ngModel)]="disputeReasonInput" required>
                    <option value="">-- Chọn lý do vi phạm --</option>
                    <option value="Không đến làm việc (No-Show hoàn toàn)">Không đến làm việc (No-Show hoàn toàn)</option>
                    <option value="Bỏ về giữa chừng / Làm không đủ thời gian">Bỏ về giữa chừng / Làm không đủ thời gian</option>
                    <option value="Làm việc hời hợt, không đúng yêu cầu kỹ năng">Làm việc hời hợt, không đúng yêu cầu kỹ năng</option>
                    <option value="Vi phạm nội quy, thái độ không tốt">Vi phạm nội quy, thái độ không tốt</option>
                    <option value="Khác">Khác (Nhập lý do cụ thể bên dưới)</option>
                  </select>
                </div>

                @if (disputeReasonInput === 'Khác') {
                  <div class="form-group mb-4">
                    <label class="form-label" style="display:block; margin-bottom:6px">Nhập lý do cụ thể *</label>
                    <input type="text" class="form-input" style="width:100%" [(ngModel)]="disputeReasonOther" placeholder="Nhập lý do của bạn..." required>
                  </div>
                }
                
                <div class="form-group mb-4">
                  <label class="form-label" style="display:block; margin-bottom:6px">Mô tả bằng chứng chi tiết *</label>
                  <textarea class="form-input" style="width:100%" rows="3" [(ngModel)]="disputeEvidenceText" placeholder="Mô tả cụ thể bằng chứng (tin nhắn, hình ảnh công việc)..." required></textarea>
                </div>

                <div class="form-group mb-6">
                  <label class="form-label" style="display:block; margin-bottom:6px">Link ảnh/tài liệu bằng chứng</label>
                  <input type="text" class="form-input" style="width:100%" [(ngModel)]="disputeEvidenceUrl" placeholder="VD: https://res.cloudinary.com/...">
                </div>

                <div class="form-actions d-flex justify-end gap-3" style="justify-content:flex-end">
                  <button class="btn btn-secondary" (click)="appToDispute.set(null)">Hủy</button>
                  <button class="btn btn-danger" (click)="submitNoShow(appToDispute()!)" [disabled]="!disputeReasonInput || (disputeReasonInput === 'Khác' && !disputeReasonOther) || !disputeEvidenceText">Gửi báo cáo</button>
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
                <button class="btn btn-primary" style="width:100%" (click)="generatedOtp.set(''); stopOtpWaiting()">Đóng</button>
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

          </main>
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
      min-height: 100vh;
      background-color: var(--bg-primary);
    }
    
    /* Layout styles moved to styles.css */    .profile-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      color: white; font-size: 24px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.3s ease;
    }

    .profile-header h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); }
    .role-badge { font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; color: var(--text-secondary); }
    
    .wallet-info {
      background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.05);
    }
    .wallet-info .label { font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 4px; }
    .wallet-info .balance { font-size: 1.75rem; color: var(--primary-light); font-weight: 800; display: block; margin-bottom: 8px; }
    .package-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--success); background: rgba(16,185,129,0.1); padding: 4px 8px; border-radius: 6px; margin-bottom: 16px; }
    .wallet-actions { display: flex; flex-direction: column; gap: 8px; }
    
    .stats-mini { display: flex; flex-direction: column; gap: 16px; }
    .stat-item { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .stat-item:last-child { border-bottom: none; padding-bottom: 0; }
    .stat-item .material-icons-round { font-size: 28px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.05); }
    .stat-item .text-primary { color: var(--primary-light); }
    .stat-item .text-success { color: var(--success); }
    .stat-item .text-warning { color: var(--warning); }
    .stat-value { display: block; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
    .stat-label { font-size: 0.8rem; color: var(--text-secondary); }
    
    /* Media queries moved to styles.css */

    .auth-required {
      text-align: center;
      padding: var(--space-16);
      max-width: 500px;
      margin: var(--space-10) auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
    }

    .auth-required p { color: var(--text-secondary); font-size: 1rem; line-height: 1.6; }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #0F172A;
      border: 1px solid rgba(255,255,255,0.05);
    }

    .stat-icon .material-icons-round {
      color: var(--primary-light);
      font-size: 24px;
    }

    .stat-number {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
      color: #F8FAFC;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .post-form {
      margin-bottom: var(--space-10);
      background: #1E293B;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: var(--space-8);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
    }

    .post-form h2 {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: var(--space-8);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      color: #FFFFFF;
    }

    .post-form h2 .material-icons-round {
      color: var(--primary-light);
      font-size: 28px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-6);
      margin-bottom: var(--space-4);
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-6);
      margin-bottom: var(--space-4);
    }

    .form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-6);
      margin-bottom: var(--space-4);
    }

    .form-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-6);
      margin-bottom: var(--space-4);
    }

    /* Make responsive for smaller screens */
    @media (max-width: 1200px) {
      .form-grid-3, .form-grid-4 {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 768px) {
      .form-grid-2, .form-grid-3, .form-grid-4 {
        grid-template-columns: 1fr;
      }
    }

    .error-text { color: #EF4444; font-size: 0.8rem; margin-top: 4px; display: block; }

    .toggle-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      background: #0F172A;
      padding: var(--space-5);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.04);
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .toggle-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .toggle-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .toggle-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255,255,255,0.1); transition: .4s; border-radius: 24px;
    }
    .toggle-slider:before {
      position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
      background-color: white; transition: .4s; border-radius: 50%;
    }
    input:checked + .toggle-slider { background-color: var(--primary-light); }
    input:checked + .toggle-slider:before { transform: translateX(20px); }

    .form-actions {
      display: flex;
      gap: var(--space-4);
      justify-content: flex-end;
      margin-top: var(--space-8);
      padding-top: var(--space-6);
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    .alert {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      margin-bottom: var(--space-6);
    }

    .alert .material-icons-round { font-size: 20px; }

    .alert-success {
      background: rgba(16, 185, 129, 0.1);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .jobs-section h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: var(--space-6);
      color: #FFFFFF;
      padding-bottom: 12px;
      border-bottom: 2px solid rgba(255,255,255,0.05);
    }

    .jobs-table {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .job-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-6);
      background: #1E293B;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .job-row:hover:not(.job-expired) {
      background: #233044;
      border-color: rgba(255, 255, 255, 0.1);
    }

    .job-row.job-expired {
      opacity: 0.7;
      background: #0F172A;
    }

    .job-title-row {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-3);
    }

    .job-title-link {
      font-weight: 600;
      font-size: 1.1rem;
      color: #FFFFFF;
      text-decoration: none;
      transition: color 0.2s;
    }

    .job-title-link:hover { color: var(--primary-light); }

    .job-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4) var(--space-6);
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    
    .job-meta span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .job-actions {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .stat-mini {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .stat-mini .material-icons-round { font-size: 16px; color: var(--text-muted); }

    .badge-warning {
      background: rgba(245, 158, 11, 0.1);
      color: #FBBF24;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    
    .badge-success {
      background: rgba(16, 185, 129, 0.1);
      color: #34D399;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    
    .badge-danger {
      background: rgba(239, 68, 68, 0.1);
      color: #F87171;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    .badge-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-secondary);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .empty-jobs {
      text-align: center;
      padding: var(--space-16) var(--space-8);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      background: #1E293B;
      border: 1px dashed rgba(255,255,255,0.1);
      border-radius: 12px;
    }

    .empty-jobs p { color: var(--text-secondary); font-size: 1rem; }

    @media (max-width: 768px) {
      .dashboard-header { flex-direction: column; gap: var(--space-5); align-items: flex-start; }
      .form-row { grid-template-columns: 1fr; }
      .job-row { flex-direction: column; align-items: flex-start; gap: var(--space-4); }
      .job-actions { flex-wrap: wrap; width: 100%; justify-content: flex-start; }
      .modal-content { max-width: 95vw !important; padding: var(--space-5) !important; max-height: 85vh !important; }
    }

    @media (max-width: 480px) {
      .job-actions { flex-direction: column; align-items: stretch; }
      .stat-mini { justify-content: center; }
    }
    
    /* Utility classes for modal */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content { 
      background: #1E293B; 
      padding: var(--space-8); 
      border-radius: 16px; 
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .d-flex { display: flex; } .flex-col { flex-direction: column; }
    .justify-between { justify-content: space-between; } .items-center { align-items: center; } .justify-center { justify-content: center; } .justify-end { justify-content: flex-end; }
    .gap-2 { gap: 8px; } .gap-3 { gap: 12px; } .gap-4 { gap: 16px; }
    .p-4 { padding: 16px; } .p-6 { padding: 24px; } .p-8 { padding: 32px; }
    .mb-4 { margin-bottom: 16px; } .mb-6 { margin-bottom: 24px; } .mt-2 { margin-top: 8px; }
    .rounded-lg { border-radius: 8px; }
    .bg-secondary { background: var(--bg-secondary); }
    .border { border: 1px solid var(--border-color); }
    .text-center { text-align: center; }
    .icon-btn { padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
    
    @keyframes rotating {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .rotating {
      animation: rotating 1.5s linear infinite;
    }
  `]
})
export class EmployerDashboardComponent implements OnInit, OnDestroy {
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

  // SignalR properties for OTP Real-time
  private hubConnection?: HubConnection;
  waitingOtpAppId: number | null = null;
  waitingJobId: number | null = null;

  ngOnDestroy() {
    this.stopOtpWaiting();
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR connection stopped.'))
        .catch((err) => console.error('Error stopping SignalR:', err));
    }
  }

  showPackagesModal = signal(false);
  packages = signal<any[]>([]);
  isProcessingPackage = signal(false);

  userToAssign = signal<number | null>(null);
  jobToApprove = signal<Job | null>(null);
  jobToDispute = signal<Job | null>(null);
  disputeReasonInput = '';
  disputeReasonOther = '';
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
  formErrors: Record<string, string> = {};
  showFreeTierConfirm = signal(false);

  isPremiumEmployer(): boolean {
    const pkg = this.auth.currentUser()?.activePackage;
    if (!pkg) return false;
    if (pkg.includes('VIP') || pkg.includes('Premium')) return true;
    const match = pkg.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10) >= 12;
    }
    return false;
  }

  employerJobs = computed(() => {
    const user = this.auth.currentUser();
    if (user?.companyId) {
      return this.jobService.getJobsByCompanyId(user.companyId);
    }
    return [];
  });
  
  currentPage = signal(1);
  pageSize = signal(5);
  sortOrder = signal<'newest' | 'oldest'>('newest');
  searchKeyword = signal('');

  filteredJobs = computed(() => {
    let jobs = [...this.employerJobs()];
    const kw = this.searchKeyword().toLowerCase().trim();
    if (kw) {
      jobs = jobs.filter(j => j.title.toLowerCase().includes(kw));
    }
    if (this.sortOrder() === 'newest') {
      // Mới nhất ở dưới cùng (Ascending)
      jobs.sort((a, b) => {
        const timeA = new Date(a.postedDate || 0).getTime();
        const timeB = new Date(b.postedDate || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return Number(a.id) - Number(b.id);
      });
    } else {
      // Cũ nhất ở dưới cùng (Descending)
      jobs.sort((a, b) => {
        const timeA = new Date(a.postedDate || 0).getTime();
        const timeB = new Date(b.postedDate || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return Number(b.id) - Number(a.id);
      });
    }
    return jobs;
  });

  filteredAndPagedJobs = computed(() => {
    const jobs = this.filteredJobs();
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return jobs.slice(startIndex, startIndex + this.pageSize());
  });
  
  totalPages = computed(() => Math.ceil(this.filteredJobs().length / this.pageSize()) || 1);
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  getPagesArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }
  
  totalViews = computed(() => this.employerJobs().reduce((sum, j) => sum + j.views, 0));
  totalApplications = computed(() => this.employerJobs().reduce((sum, j) => sum + j.applications, 0));

  constructor() {
  }

  ngOnInit() {
    this.connectSignalR();
    this.auth.fetchProfile().subscribe({
      error: (err) => console.error('Failed to refresh employer profile:', err)
    });
    this.auth.fetchBalance().subscribe({
      error: (err) => console.error('Failed to refresh wallet balance:', err)
    });
    this.jobService.fetchJobs();
    this.loadPackages();
  }

  loadPackages() {
    this.http.get<any[]>(`${API_BASE_URL}/subscription/packages`).subscribe({
      next: (data) => {
        const mapped = data.map(p => ({
          ...p,
          duration: `${p.durationMonths} tháng`
        }));
        this.packages.set(mapped);
      },
      error: (err) => {
        console.error('Failed to load packages:', err);
      }
    });
  }

  openPackagesModal() {
    this.showFreeTierConfirm.set(false);
    this.showPackagesModal.set(true);
  }

  buyPackage(pkg: any) {
    const user = this.auth.currentUser();
    if (!user) return;

    if ((user.balance || 0) < pkg.price) {
      this.toast.error('Số dư ví không đủ để mua gói này. Vui lòng nạp thêm tiền!');
      return;
    }

    if (confirm(`Xác nhận mua ${pkg.name} với giá ${pkg.price.toLocaleString('vi-VN')}đ?`)) {
      this.isProcessingPackage.set(true);
      this.http.post(`${API_BASE_URL}/subscription/subscribe/${pkg.id}`, {}).subscribe({
        next: (res: any) => {
          this.isProcessingPackage.set(false);
          this.toast.success(res.message || 'Đăng ký gói dịch vụ thành công!');
          this.auth.fetchProfile().subscribe();
          this.auth.fetchBalance().subscribe();
          this.showPackagesModal.set(false);
        },
        error: (err) => {
          this.isProcessingPackage.set(false);
          this.toast.error(err.error?.message || 'Có lỗi xảy ra khi đăng ký gói.');
        }
      });
    }
  }

  testDeposit() {
    this.isProcessingPackage.set(true);
    this.http.post(`${API_BASE_URL}/wallet/deposit`, { amount: 500000 }).subscribe({
      next: () => {
        this.toast.success('Nạp 500.000đ thành công (Test)');
        this.auth.fetchBalance().subscribe();
        this.isProcessingPackage.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Nạp tiền thất bại');
        this.isProcessingPackage.set(false);
      }
    });
  }

  private getEmptyForm() {
    return {
      title: '',
      type: 'Freelance',
      category: '',
      location: '',
      headCount: 1,
      salaryPerPerson: null as number | null,
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
      salaryPerPerson: job.budget ? Math.round(job.budget / (job.headCount || 1)) : null,
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
      setTimeout(() => this.formData.isUrgent = false, 0);
      this.toast.warning('Tính năng Tuyển gấp chỉ dành cho tài khoản VIP. Mời bạn nâng cấp gói dịch vụ!');
      this.openPackagesModal();
    }
  }

  onSubmitForm() {
    this.formErrors = {};
    let hasError = false;

    if (!this.formData.title) { this.formErrors['title'] = 'Vui lòng nhập tiêu đề.'; hasError = true; }
    if (!this.formData.location) { this.formErrors['location'] = 'Vui lòng nhập địa điểm.'; hasError = true; }
    if (!this.formData.category) { this.formErrors['category'] = 'Vui lòng chọn danh mục.'; hasError = true; }
    if (!this.formData.description) { this.formErrors['description'] = 'Vui lòng nhập mô tả công việc.'; hasError = true; }
    if (!this.formData.deadline) { this.formErrors['deadline'] = 'Vui lòng chọn hạn nộp hồ sơ.'; hasError = true; }
    if (!this.formData.headCount || this.formData.headCount < 1) { this.formErrors['headCount'] = 'Số lượng tuyển phải từ 1 trở lên.'; hasError = true; }
    
    if (this.formData.deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadlineDate = new Date(this.formData.deadline);
      if (deadlineDate < today) {
        this.formErrors['deadline'] = 'Hạn nộp hồ sơ không được ở trong quá khứ.';
        hasError = true;
      }
    }

    const salary = this.formData.salaryPerPerson || 0;
    if (salary < 50000) {
      this.formErrors['salaryPerPerson'] = 'Mức lương / người tối thiểu là 50.000đ.';
      hasError = true;
    }
    this.formData.budget = salary * (this.formData.headCount || 1);

    if (hasError) {
      this.toast.error('Vui lòng kiểm tra lại các trường thông tin.');
      return;
    }

    const user = this.auth.currentUser();
    if (!user) return;

    const hasActivePackage = !!user.activePackage && user.packageExpiry && new Date(user.packageExpiry) > new Date();
    if (this.formData.isUrgent && !hasActivePackage) {
      this.formErrors['isUrgent'] = 'Vui lòng mua gói dịch vụ để đăng tin tuyển gấp!';
      this.toast.error('Vui lòng mua gói dịch vụ để đăng tin tuyển gấp!');
      return;
    }

    if (!this.editingJobId() && !hasActivePackage) {
      // Show free tier confirmation modal instead of directly submitting
      this.showFreeTierConfirm.set(true);
      return;
    }

    this.executePostJob();
  }

  executePostJob() {
    this.showFreeTierConfirm.set(false);
    const user = this.auth.currentUser();
    if (!user) return;

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
        salary: this.formData.salaryPerPerson ? `${this.formData.salaryPerPerson.toLocaleString('vi-VN')}đ/người` : 'Thỏa thuận',
        budget: this.formData.budget || 0,
        description: this.formData.description,
        requirements,
        benefits,
        tags,
        deadline: this.formData.deadline,
        isRemote: this.formData.isRemote,
        isUrgent: this.formData.isUrgent,
        headCount: this.formData.headCount || 1,
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
      if (!user.businessLicenseUrl || !user.isBusinessLicenseVerified) {
        this.postSuccess.set(false);
        this.postMessage.set('Giấy phép kinh doanh của bạn chưa được xác thực. Vui lòng cập nhật Giấy phép kinh doanh (có chứa MST) trong mục Hồ sơ và chờ hệ thống xác nhận trước khi đăng tin.');
        this.toast.error('Vui lòng xác thực Giấy phép kinh doanh trước khi đăng tin!');
        return;
      }

      const budget = this.formData.budget || 0;

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
        salary: this.formData.salaryPerPerson ? `${this.formData.salaryPerPerson.toLocaleString('vi-VN')}đ/người` : 'Thỏa thuận',
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
          this.userToAssign.set(null); // close confirm modal
          this.toast.success('Giao việc thành công!');
          // Refresh the list instead of closing the modal
          if (this.selectedJobForApplicants()) {
            const currentJob = this.selectedJobForApplicants()!;
            currentJob.acceptedCount = (currentJob.acceptedCount || 0) + 1; // Update UI immediately
            this.viewApplicants(currentJob);
          }
        } else {
          this.toast.error(res.message || 'Có lỗi xảy ra khi giao việc');
        }
      },
      error: () => this.toast.error('Có lỗi xảy ra khi giao việc')
    });
  }

  appToApprove = signal<any | null>(null);
  appToDispute = signal<any | null>(null);

  generateAppOtp(app: any, type: 'checkin' | 'checkout') {
    this.jobService.generateApplicationOtp(app.id, type).subscribe({
      next: (res) => {
        if (res.success && res.otp) {
          this.otpType.set(type);
          this.generatedOtp.set(res.otp);

          this.waitingOtpAppId = app.id;
          this.waitingJobId = app.jobId;
        } else {
          this.toast.error(res.message || `Không thể tạo OTP ${type}.`);
        }
      },
      error: () => this.toast.error('Lỗi kết nối khi tạo OTP.')
    });
  }

  private connectSignalR() {
    const hubUrl = API_BASE_URL.endsWith('/api')
      ? API_BASE_URL.substring(0, API_BASE_URL.length - 4) + '/hub/dashboard'
      : '/hub/dashboard';

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('CheckInSuccess', (appId: number) => {
      console.log('[SignalR] CheckInSuccess received for appId:', appId);
      if (this.waitingOtpAppId === appId && this.otpType() === 'checkin') {
        this.handleOtpSuccess('checkin');
      }
    });

    this.hubConnection.on('CheckOutSuccess', (appId: number) => {
      console.log('[SignalR] CheckOutSuccess received for appId:', appId);
      if (this.waitingOtpAppId === appId && this.otpType() === 'checkout') {
        this.handleOtpSuccess('checkout');
      }
    });

    this.hubConnection.start()
      .then(() => console.log('Employer SignalR connection established successfully.'))
      .catch((err) => console.error('Error starting SignalR connection:', err));
  }

  handleOtpSuccess(type: 'checkin' | 'checkout') {
    this.stopOtpWaiting();
    this.generatedOtp.set('');
    this.toast.success(`✅ Sinh viên đã ${type === 'checkin' ? 'Check-in' : 'Check-out'} thành công!`);
    if (this.selectedJobForApplicants()) {
      this.viewApplicants(this.selectedJobForApplicants()!);
    }
  }

  stopOtpWaiting() {
    this.waitingOtpAppId = null;
    this.waitingJobId = null;
  }

  approveApplicationCompletion(app: any) {
    this.jobService.approveApplicationCompletion(app.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.appToApprove.set(null);
          this.toast.success('Đã nghiệm thu sinh viên thành công!');
          // Refresh applications
          if (this.selectedJobForApplicants()) {
            this.viewApplicants(this.selectedJobForApplicants()!);
          }
        } else {
          this.toast.error(res.message || 'Có lỗi xảy ra khi nghiệm thu');
        }
      },
      error: () => this.toast.error('Lỗi kết nối khi nghiệm thu.')
    });
  }

  submitNoShow(app: any) {
    let finalReason = this.disputeReasonInput === 'Khác' ? this.disputeReasonOther : this.disputeReasonInput;
    if (!finalReason) return;

    // Append evidence text if provided
    if (this.disputeEvidenceText) {
      finalReason += `\n- Bằng chứng/Mô tả thêm: ${this.disputeEvidenceText}`;
    }

    this.jobService.reportApplicationNoShow(app.id, finalReason, this.disputeEvidenceUrl).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Báo cáo vi phạm thành công!');
          this.appToDispute.set(null);
          this.disputeReasonInput = '';
          this.disputeReasonOther = '';
          this.disputeEvidenceText = '';
          this.disputeEvidenceUrl = '';
          
          if (this.selectedJobForApplicants()) {
            this.viewApplicants(this.selectedJobForApplicants()!);
          }
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => this.toast.error('Lỗi khi gửi báo cáo.')
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
