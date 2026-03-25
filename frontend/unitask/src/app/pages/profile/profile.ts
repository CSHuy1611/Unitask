import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { JobService } from '../../services/job.service';
import { Job } from '../../models/job.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="profile-page">
      <div class="container">
        @if (!auth.isLoggedIn()) {
          <div class="auth-required glass-card animate-fade-in-up">
            <span class="material-icons-round" style="font-size:64px;color:var(--primary-light)">person_off</span>
            <h2>Vui lòng đăng nhập</h2>
            <p>Bạn cần đăng nhập để xem hồ sơ cá nhân.</p>
            <a routerLink="/login" class="btn btn-primary btn-lg">Đăng nhập</a>
          </div>
        } @else {
          <div class="profile-grid">
            <!-- Profile card -->
            <div class="profile-card glass-card animate-fade-in-up">
              <div class="profile-avatar">
                {{ auth.currentUser()?.avatar }}
              </div>
              <h2>{{ auth.currentUser()?.fullName }}</h2>
              <p class="profile-role">
                @if (auth.isStudent()) {
                  🎓 Sinh viên
                } @else {
                  🏢 Nhà tuyển dụng
                }
              </p>
              <div class="profile-info-list">
                <div class="info-row">
                  <span class="material-icons-round">email</span>
                  <span>{{ auth.currentUser()?.email }}</span>
                </div>
                <div class="info-row">
                  <span class="material-icons-round">phone</span>
                  <span>{{ auth.currentUser()?.phone }}</span>
                </div>
                @if (auth.currentUser()?.dateOfBirth) {
                  <div class="info-row">
                    <span class="material-icons-round">cake</span>
                    <span>{{ auth.currentUser()?.dateOfBirth }}</span>
                  </div>
                }
                @if (auth.currentUser()?.address) {
                  <div class="info-row">
                    <span class="material-icons-round">location_on</span>
                    <span>{{ auth.currentUser()?.address }}</span>
                  </div>
                }
                @if (auth.isStudent()) {
                  <div class="info-row">
                    <span class="material-icons-round">school</span>
                    <span>{{ auth.currentUser()?.university }}</span>
                  </div>
                  <div class="info-row">
                    <span class="material-icons-round">menu_book</span>
                    <span>{{ auth.currentUser()?.major }} - Năm {{ auth.currentUser()?.year }}</span>
                  </div>
                } @else {
                  <div class="info-row">
                    <span class="material-icons-round">business</span>
                    <span>{{ auth.currentUser()?.companyName }}</span>
                  </div>
                  <div class="info-row">
                    <span class="material-icons-round">badge</span>
                    <span>{{ auth.currentUser()?.position }}</span>
                  </div>
                  <div class="info-row" style="margin-top:var(--space-2); padding-top:var(--space-2); border-top:1px dashed var(--border-light)">
                    <span class="material-icons-round" style="color:var(--primary-light)">account_balance_wallet</span>
                    <strong style="color:var(--primary-light)">{{ (auth.currentUser()?.balance || 0).toLocaleString('vi-VN') }}đ</strong>
                  </div>
                  @if (auth.currentUser()?.activePackage) {
                    <div class="info-row">
                      <span class="material-icons-round" style="color:var(--success)">stars</span>
                      <span style="color:var(--success); font-weight:600">{{ auth.currentUser()?.activePackage }}</span>
                    </div>
                  }
                }
                <div class="info-row">
                  <span class="material-icons-round">calendar_today</span>
                  <span>Tham gia: {{ auth.currentUser()?.createdAt }}</span>
                </div>
              </div>

              @if (auth.isStudent() && auth.currentUser()?.skills?.length) {
                <div class="skills-section">
                  <h4>Kỹ năng</h4>
                  <div class="skills-list">
                    @for (skill of auth.currentUser()?.skills; track skill) {
                      <span class="badge badge-primary">{{ skill }}</span>
                    }
                  </div>
                </div>
              }

              @if (auth.isStudent() && auth.currentUser()?.bio) {
                <div class="bio-section">
                  <h4>Giới thiệu</h4>
                  <p>{{ auth.currentUser()?.bio }}</p>
                </div>
              }

              <button class="btn btn-secondary full-width" style="margin-top:var(--space-5)" (click)="toggleEditMode()">
                <span class="material-icons-round" style="font-size:18px">edit</span>
                {{ isEditing() ? 'Đóng chỉnh sửa' : 'Chỉnh sửa hồ sơ' }}
              </button>
            </div>

            <!-- Right Column -->
            <div class="profile-content">
              <!-- Edit Profile Form -->
              @if (isEditing()) {
                <div class="edit-section glass-card animate-fade-in-up">
                  <h3><span class="material-icons-round">edit_note</span> Chỉnh sửa hồ sơ</h3>
                  
                  @if (editSuccess()) {
                    <div class="alert alert-success animate-fade-in">
                      <span class="material-icons-round">check_circle</span>
                      {{ editMessage() }}
                    </div>
                  }

                  <form (ngSubmit)="onSaveProfile()">
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">Họ và tên *</label>
                        <input type="text" class="form-input" [(ngModel)]="editForm.fullName" name="fullName" required>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Số điện thoại</label>
                        <input type="tel" class="form-input" [(ngModel)]="editForm.phone" name="phone">
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">Ngày sinh</label>
                        <input type="date" class="form-input" [(ngModel)]="editForm.dateOfBirth" name="dateOfBirth">
                      </div>
                      <div class="form-group">
                        <label class="form-label">Địa chỉ</label>
                        <input type="text" class="form-input" placeholder="VD: Quận 9, TP. HCM" [(ngModel)]="editForm.address" name="address">
                      </div>
                    </div>
                    @if (auth.isStudent()) {
                      <div class="form-row">
                        <div class="form-group">
                          <label class="form-label">Trường</label>
                          <input type="text" class="form-input" [(ngModel)]="editForm.university" name="university">
                        </div>
                        <div class="form-group">
                          <label class="form-label">Ngành học</label>
                          <input type="text" class="form-input" [(ngModel)]="editForm.major" name="major">
                        </div>
                      </div>
                      <div class="form-row">
                        <div class="form-group">
                          <label class="form-label">Năm</label>
                          <select class="form-select" [(ngModel)]="editForm.year" name="year">
                            <option [value]="1">Năm 1</option>
                            <option [value]="2">Năm 2</option>
                            <option [value]="3">Năm 3</option>
                            <option [value]="4">Năm 4</option>
                            <option [value]="5">Năm 5</option>
                          </select>
                        </div>
                        <div class="form-group">
                          <label class="form-label">Kỹ năng (phân cách bằng dấu phẩy)</label>
                          <input type="text" class="form-input" [(ngModel)]="editForm.skillsStr" name="skills" placeholder="VD: Mẫu ảnh, Canva, MC">
                        </div>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Giới thiệu bản thân</label>
                        <textarea class="form-textarea" rows="3" [(ngModel)]="editForm.bio" name="bio" placeholder="Viết đôi dòng về bản thân..."></textarea>
                      </div>
                    }
                    <div class="form-actions">
                      <button type="button" class="btn btn-secondary" (click)="isEditing.set(false)">Hủy</button>
                      <button type="submit" class="btn btn-primary">
                        <span class="material-icons-round" style="font-size:18px">save</span> Lưu thay đổi
                      </button>
                    </div>
                  </form>
                </div>
              }

              <!-- CV Upload Section (Student only) -->
              @if (auth.isStudent()) {
                <div class="cv-section glass-card animate-fade-in-up" style="animation-delay:0.1s">
                  <h3><span class="material-icons-round">description</span> CV / Hồ sơ năng lực</h3>
                  
                  @if (auth.currentUser()?.cvFileName) {
                    <div class="cv-uploaded">
                      <div class="cv-file-info">
                        <span class="material-icons-round cv-file-icon">picture_as_pdf</span>
                        <div>
                          <strong>{{ auth.currentUser()?.cvFileName }}</strong>
                          <span class="cv-date">Tải lên: {{ auth.currentUser()?.cvUploadDate }}</span>
                        </div>
                      </div>
                      <button class="btn btn-secondary btn-sm" (click)="onRemoveCV()">
                        <span class="material-icons-round" style="font-size:16px">delete</span> Xóa
                      </button>
                    </div>
                  }

                  <div class="upload-area" (click)="cvInput.click()" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
                    <span class="material-icons-round upload-icon">cloud_upload</span>
                    <p><strong>Click để tải lên</strong> hoặc kéo thả file vào đây</p>
                    <span class="upload-note">Hỗ trợ: PDF, DOC, DOCX (max 10MB)</span>
                  </div>
                  <input #cvInput type="file" accept=".pdf,.doc,.docx" style="display:none" (change)="onCVSelected($event)">
                </div>
              }

              <!-- eKYC Section -->
              <div class="ekyc-section glass-card animate-fade-in-up" style="animation-delay:0.15s">
                <h3><span class="material-icons-round">verified_user</span> Xác thực danh tính (eKYC)</h3>

                <div class="ekyc-status" [class]="'status-' + auth.currentUser()?.ekycStatus">
                  @switch (auth.currentUser()?.ekycStatus) {
                    @case ('verified') {
                      <div class="status-badge verified">
                        <span class="material-icons-round">check_circle</span>
                        <strong>Đã xác thực</strong>
                      </div>
                      <p>Tài khoản của bạn đã được xác thực ngày {{ auth.currentUser()?.ekycDate }}. Bạn có thể sử dụng toàn bộ tính năng của UniTask.</p>
                    }
                    @case ('pending') {
                      <div class="status-badge pending">
                        <span class="material-icons-round">hourglass_top</span>
                        <strong>Đang chờ duyệt</strong>
                      </div>
                      <p>Hồ sơ eKYC của bạn đang được Admin xem xét. Quá trình thường mất 1-2 ngày làm việc.</p>
                      <div class="processing-bar">
                        <div class="processing-fill"></div>
                      </div>
                    }
                    @case ('rejected') {
                      <div class="status-badge rejected">
                        <span class="material-icons-round">cancel</span>
                        <strong>Bị từ chối</strong>
                      </div>
                      <p>Hồ sơ eKYC của bạn không được duyệt. Vui lòng gửi lại với giấy tờ rõ ràng hơn.</p>
                    }
                    @default {
                      <div class="status-badge unverified">
                        <span class="material-icons-round">gpp_maybe</span>
                        <strong>Chưa xác thực</strong>
                      </div>
                      <p>Xác thực danh tính để tăng uy tín hồ sơ và tiếp cận nhiều cơ hội hơn.</p>
                    }
                  }
                </div>

                @if (auth.currentUser()?.ekycStatus !== 'verified' && auth.currentUser()?.ekycStatus !== 'pending') {
                  <div class="ekyc-form">
                    <h4>Tải lên giấy tờ tùy thân</h4>
                    <div class="upload-area" (click)="onUploadClick()">
                      <span class="material-icons-round upload-icon">cloud_upload</span>
                      <p><strong>Click để tải lên</strong> hoặc kéo thả file vào đây</p>
                      <span class="upload-note">CCCD/CMND - Mặt trước và mặt sau (PNG, JPG, max 5MB)</span>
                    </div>

                    <div class="upload-previews">
                      <div class="upload-preview">
                        <div class="preview-placeholder">
                          <span class="material-icons-round">badge</span>
                          <span>Mặt trước</span>
                        </div>
                      </div>
                      <div class="upload-preview">
                        <div class="preview-placeholder">
                          <span class="material-icons-round">badge</span>
                          <span>Mặt sau</span>
                        </div>
                      </div>
                    </div>

                    <button class="btn btn-primary btn-lg full-width" (click)="onSubmitEkyc()">
                      <span class="material-icons-round">verified</span> Gửi xác thực
                    </button>
                  </div>
                }
              </div>

              <!-- My Working Jobs (Student) -->
              @if (auth.isStudent()) {
                <div class="working-section glass-card animate-fade-in-up" style="animation-delay:0.18s">
                  <h3><span class="material-icons-round">work</span> Công việc của tôi</h3>
                  @if (workingJobs().length) {
                    <div class="applied-list">
                      @for (job of workingJobs(); track job.id) {
                        <div class="applied-item" style="flex-direction: column; align-items: stretch; gap: 12px">
                          <div style="display:flex; justify-content:space-between; align-items:flex-start">
                            <div class="applied-info">
                              <a [routerLink]="['/jobs', job.id]" style="text-decoration:none; color:inherit">
                                <strong style="font-size:16px">{{ job.title }}</strong>
                              </a>
                              <span>{{ job.company }} • 💰 {{ job.budget?.toLocaleString('vi-VN') }}đ</span>
                            </div>
                            @if (job.status === 'in_progress') {
                              <span class="badge badge-warning">Đang thực hiện</span>
                            } @else if (job.status === 'pending_confirmation') {
                              <span class="badge badge-primary">Chờ NTD nghiệm thu</span>
                            } @else if (job.status === 'completed') {
                              <span class="badge badge-success">Đã hoàn thành</span>
                            }
                          </div>
                          @if (job.status === 'in_progress') {
                            <div style="text-align:right">
                              <button class="btn btn-success btn-sm" (click)="studentCompleteJob(job)">
                                <span class="material-icons-round" style="font-size:16px">task_alt</span> Báo cáo hoàn thành
                              </button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="empty-applied">
                      <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">work_outline</span>
                      <p>Bạn chưa được giao công việc nào</p>
                    </div>
                  }
                </div>
              }

              <!-- Applied Jobs (Student) -->
              @if (auth.isStudent()) {
                <div class="applied-section glass-card animate-fade-in-up" style="animation-delay:0.2s">
                  <h3><span class="material-icons-round">history</span> Lịch sử ứng tuyển</h3>
                  @if (appliedJobs().length) {
                    <div class="applied-list">
                      @for (job of appliedJobs(); track job.id) {
                        <a [routerLink]="['/jobs', job.id]" class="applied-item">
                          <div class="applied-info">
                            <strong>{{ job.title }}</strong>
                            <span>{{ job.company }} • {{ job.location }}</span>
                          </div>
                          <span class="badge badge-success">Đã nộp</span>
                        </a>
                      }
                    </div>
                  } @else {
                    <div class="empty-applied">
                      <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">inbox</span>
                      <p>Chưa ứng tuyển việc nào</p>
                      <a routerLink="/jobs" class="btn btn-primary">Tìm việc ngay</a>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .profile-page {
      padding: calc(80px + var(--space-8)) 0 var(--space-16);
    }

    .auth-required {
      text-align: center;
      padding: var(--space-16);
      max-width: 500px;
      margin: var(--space-10) auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
    }

    .auth-required p { color: var(--text-secondary); }

    .profile-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: var(--space-6);
      align-items: start;
    }

    .profile-card {
      text-align: center;
      position: sticky;
      top: 80px;
    }

    .profile-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-2xl);
      font-weight: 800;
      color: white;
      margin: 0 auto var(--space-4);
      box-shadow: 0 0 30px rgba(79, 70, 229, 0.3);
    }

    .profile-card h2 {
      font-size: var(--font-size-xl);
      font-weight: 700;
      margin-bottom: var(--space-1);
    }

    .profile-role {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-5);
    }

    .profile-info-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      text-align: left;
      padding-top: var(--space-5);
      border-top: 1px solid var(--border-light);
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .info-row .material-icons-round {
      font-size: 18px;
      color: var(--text-muted);
    }

    .skills-section, .bio-section {
      margin-top: var(--space-5);
      padding-top: var(--space-5);
      border-top: 1px solid var(--border-light);
      text-align: left;
    }

    .skills-section h4, .bio-section h4 {
      font-size: var(--font-size-sm);
      font-weight: 600;
      margin-bottom: var(--space-3);
    }

    .bio-section p {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      line-height: 1.7;
    }

    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .profile-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }

    /* Edit Section */
    .edit-section h3, .cv-section h3, .ekyc-section h3, .applied-section h3 {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-lg);
      font-weight: 700;
      margin-bottom: var(--space-5);
    }

    .edit-section h3 .material-icons-round,
    .cv-section h3 .material-icons-round,
    .ekyc-section h3 .material-icons-round,
    .applied-section h3 .material-icons-round {
      color: var(--primary-light);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }

    .form-actions {
      display: flex;
      gap: var(--space-3);
      justify-content: flex-end;
      margin-top: var(--space-4);
    }

    .alert {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-lg);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-5);
    }

    .alert .material-icons-round { font-size: 20px; }

    .alert-success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    /* CV Section */
    .cv-uploaded {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4);
      background: rgba(79, 70, 229, 0.08);
      border: 1px solid rgba(79, 70, 229, 0.2);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-4);
    }

    .cv-file-info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .cv-file-icon {
      font-size: 32px;
      color: var(--primary-light);
    }

    .cv-file-info strong {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--text-primary);
    }

    .cv-date {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    /* eKYC */
    .ekyc-status {
      padding: var(--space-5);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-6);
    }

    .status-verified {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .status-pending {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .status-rejected {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .status-none {
      background: rgba(100, 116, 139, 0.08);
      border: 1px solid rgba(100, 116, 139, 0.2);
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-base);
      margin-bottom: var(--space-3);
    }

    .status-badge.verified { color: var(--success); }
    .status-badge.pending { color: var(--warning); }
    .status-badge.rejected { color: #EF4444; }
    .status-badge.unverified { color: var(--text-muted); }

    .status-badge .material-icons-round { font-size: 24px; }

    .ekyc-status p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      line-height: 1.6;
    }

    .processing-bar {
      height: 4px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-full);
      margin-top: var(--space-3);
      overflow: hidden;
    }

    .processing-fill {
      height: 100%;
      width: 60%;
      background: linear-gradient(90deg, var(--warning), var(--accent-light));
      border-radius: var(--radius-full);
      animation: processAnim 2s ease-in-out infinite;
    }

    @keyframes processAnim {
      0% { width: 20%; }
      50% { width: 70%; }
      100% { width: 20%; }
    }

    .ekyc-form h4 {
      font-size: var(--font-size-sm);
      font-weight: 600;
      margin-bottom: var(--space-3);
    }

    .upload-area {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      text-align: center;
      cursor: pointer;
      transition: all var(--transition-fast);
      margin-bottom: var(--space-5);
    }

    .upload-area:hover {
      border-color: var(--primary-light);
      background: rgba(79, 70, 229, 0.05);
    }

    .upload-icon {
      font-size: 48px;
      color: var(--primary-light);
      margin-bottom: var(--space-3);
    }

    .upload-area p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-1);
    }

    .upload-note {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .upload-previews {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }

    .preview-placeholder {
      padding: var(--space-6);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      color: var(--text-muted);
      font-size: var(--font-size-xs);
    }

    .preview-placeholder .material-icons-round {
      font-size: 32px;
    }

    .full-width { width: 100%; }

    .applied-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .applied-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      text-decoration: none;
      color: inherit;
      transition: all var(--transition-fast);
    }

    .applied-item:hover {
      border-color: var(--primary-light);
      color: inherit;
    }

    .applied-info {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .applied-info strong {
      font-size: var(--font-size-sm);
      color: var(--text-primary);
    }

    .applied-info span {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .empty-applied {
      text-align: center;
      padding: var(--space-8);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
    }

    .empty-applied p { color: var(--text-secondary); }

    @media (max-width: 900px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }

      .profile-card {
        position: static;
      }
    }

    @media (max-width: 480px) {
      .upload-previews { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
      .upload-area:hover .upload-icon {
      color: var(--primary);
    }
  `]
})
export class ProfileComponent {
  auth = inject(AuthService);
  private jobService = inject(JobService);

  isEditing = signal(false);
  editSuccess = signal(false);
  editMessage = signal('');

  appliedJobs = computed(() => {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'student' || !user.appliedJobs?.length) return [];
    return this.jobService.getAllJobs().filter(j => user.appliedJobs?.includes(j.id));
  });

  workingJobs = computed(() => {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'student' || !user.workingJobs?.length) return [];
    return this.jobService.getAllJobs().filter(j => user.workingJobs?.includes(j.id));
  });

  editForm = {
    fullName: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    university: '',
    major: '',
    year: 3,
    skillsStr: '',
    bio: '',
  };

  constructor() {
  }

  toggleEditMode() {
    const editing = !this.isEditing();
    this.isEditing.set(editing);
    if (editing) {
      const user = this.auth.currentUser();
      if (user) {
        this.editForm = {
          fullName: user.fullName,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth || '',
          address: user.address || '',
          university: user.university || '',
          major: user.major || '',
          year: user.year || 3,
          skillsStr: (user.skills || []).join(', '),
          bio: user.bio || '',
        };
      }
    }
  }

  onSaveProfile() {
    const result = this.auth.updateProfile({
      fullName: this.editForm.fullName,
      phone: this.editForm.phone,
      dateOfBirth: this.editForm.dateOfBirth || undefined,
      address: this.editForm.address || undefined,
      university: this.editForm.university || undefined,
      major: this.editForm.major || undefined,
      year: Number(this.editForm.year),
      skills: this.editForm.skillsStr.split(',').map(s => s.trim()).filter(Boolean),
      bio: this.editForm.bio || undefined,
    });

    if (result.success) {
      this.editSuccess.set(true);
      this.editMessage.set(result.message);
      setTimeout(() => {
        this.editSuccess.set(false);
        this.isEditing.set(false);
        alert('Ảnh chụp màn hình đã được lưu và gửi.');
      }, 1500);
    }
  }

  // Phase 4: Student confirms completion
  studentCompleteJob(job: Job) {
    if (confirm('Bạn xác nhận đã hoàn thành công việc này? Yêu cầu nghiệm thu sẽ được gửi đến Nhà tuyển dụng.')) {
      const res = this.jobService.completeJob(job.id);
      if (res.success) {
        alert('Báo cáo thành công! Số tiền ' + (job.budget?.toLocaleString('vi-VN') || 0) + 'đ sẽ được chuyển vào tài khoản của bạn sau khi Nhà tuyển dụng nghiệm thu.');
      } else {
        alert(res.message);
      }
    }
  }

  onCVSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.auth.uploadCV(file.name);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files.length) {
      const file = event.dataTransfer.files[0];
      this.auth.uploadCV(file.name);
    }
  }

  onRemoveCV() {
    const user = this.auth.currentUser();
    if (user) {
      this.auth.updateProfile({ cvFileName: undefined, cvUploadDate: undefined } as any);
    }
  }

  onUploadClick() {
    // Mock - show file picker simulation
  }

  onSubmitEkyc() {
    this.auth.submitEkyc();
  }
}
