import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { JobService } from '../../services/job.service';
import { ToastService } from '../../services/toast.service';
import { Job } from '../../models/job.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
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
              <div class="profile-avatar-wrapper">
                @if (auth.currentUser()?.avatarUrl) {
                  <img [src]="auth.currentUser()?.avatarUrl" alt="Avatar" class="profile-avatar-img" />
                } @else {
                  <div class="profile-avatar">
                    {{ auth.currentUser()?.avatar }}
                  </div>
                }
                <button class="avatar-upload-btn" (click)="avatarInput.click()" [disabled]="avatarUploading()">
                  @if (avatarUploading()) {
                    <span class="mini-spinner"></span>
                  } @else {
                    <span class="material-icons-round">photo_camera</span>
                  }
                </button>
                <input #avatarInput type="file" accept="image/png,image/jpeg,image/jpg,image/webp" style="display:none" (change)="onAvatarSelected($event)">
              </div>
              <h2>{{ auth.currentUser()?.fullName }}</h2>
              <p class="profile-role">
                @if (auth.isStudent()) {
                  🎓 Sinh viên
                } @else if (auth.isAdmin()) {
                  🛠️ Admin
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
                  <div class="info-row">
                    <span class="material-icons-round" style="color: var(--warning)">verified_user</span>
                    <span>Điểm tín nhiệm: <strong style="color: var(--warning); font-size: 15px">{{ auth.currentUser()?.reliabilityScore ?? 100 }}</strong> / 100</span>
                  </div>
                } @else if (auth.isEmployer()) {
                  <div class="info-row">
                    <span class="material-icons-round">business</span>
                    <span>{{ auth.currentUser()?.companyName }}</span>
                  </div>
                  <div class="info-row">
                    <span class="material-icons-round">badge</span>
                    <span>{{ auth.currentUser()?.position }}</span>
                  </div>
                  @if (auth.currentUser()?.activePackage) {
                    <div class="info-row">
                      <span class="material-icons-round" style="color:var(--success)">stars</span>
                      <span style="color:var(--success); font-weight:600">{{ auth.currentUser()?.activePackage }}</span>
                    </div>
                  }
                }
                <div class="info-row" style="margin-top:var(--space-2); padding-top:var(--space-2); border-top:1px dashed var(--border-light); align-items: center; justify-content: space-between;">
                  <div style="display:flex; align-items: center; gap:8px">
                    <span class="material-icons-round" style="color:var(--primary-light)">account_balance_wallet</span>
                    <strong style="color:var(--primary-light)">{{ (auth.currentUser()?.balance || 0).toLocaleString('vi-VN') }}đ</strong>
                  </div>
                  @if (auth.isStudent() || auth.isEmployer()) {
                    <button class="btn btn-primary btn-sm" (click)="showWithdrawModal.set(true)" [disabled]="(auth.currentUser()?.balance || 0) < 10000" style="padding: 6px 12px; font-size: 13px;">
                      <span class="material-icons-round" style="font-size:16px">payments</span> Rút tiền
                    </button>
                  }
                </div>
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
                    } @else if (auth.isAdmin()) {
                      <div class="form-row">
                        <div class="form-group">
                          <label class="form-label">Email nhận thông báo *</label>
                          <input type="email" class="form-input" [(ngModel)]="editForm.email" name="email" required placeholder="VD: admin@example.com">
                        </div>
                      </div>
                    } @else {
                      <div class="form-row">
                        <div class="form-group">
                          <label class="form-label">Chức vụ *</label>
                          <input type="text" class="form-input" [(ngModel)]="editForm.position" name="position" required placeholder="VD: Giám đốc nhân sự, CEO, Recruiter">
                        </div>
                        <div class="form-group">
                          <label class="form-label">Tên công ty *</label>
                          <input type="text" class="form-input" [(ngModel)]="editForm.companyName" name="companyName" required placeholder="VD: Studio Ánh Sáng">
                        </div>
                      </div>
                      <div class="form-row">
                        <div class="form-group">
                          <label class="form-label">Lĩnh vực hoạt động</label>
                          <input type="text" class="form-input" [(ngModel)]="editForm.companyIndustry" name="companyIndustry" placeholder="VD: Nhiếp ảnh / Media, Thời trang">
                        </div>
                        <div class="form-group">
                          <label class="form-label">Quy mô công ty</label>
                          <input type="text" class="form-input" [(ngModel)]="editForm.companySize" name="companySize" placeholder="VD: 5-10 nhân viên, Cá nhân">
                        </div>
                      </div>
                      <div class="form-row">
                        <div class="form-group">
                          <label class="form-label">Địa chỉ công ty</label>
                          <input type="text" class="form-input" [(ngModel)]="editForm.companyLocation" name="companyLocation" placeholder="VD: Quận 9, TP. HCM">
                        </div>
                        <div class="form-group">
                          <label class="form-label">Website công ty</label>
                          <input type="text" class="form-input" [(ngModel)]="editForm.companyWebsite" name="companyWebsite" placeholder="VD: https://company.com">
                        </div>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Giới thiệu về công ty</label>
                        <textarea class="form-textarea" rows="3" [(ngModel)]="editForm.companyDescription" name="companyDescription" placeholder="Mô tả ngắn gọn về công ty của bạn..."></textarea>
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

              <!-- Company Info Section (Employer only) -->
              @if (auth.isEmployer()) {
                <div class="cv-section glass-card animate-fade-in-up" style="animation-delay:0.1s">
                  <h3><span class="material-icons-round">business</span> Thông tin công ty / doanh nghiệp</h3>
                  
                  <div style="display: flex; flex-direction: column; gap: var(--space-4); margin-top: var(--space-4);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                      <div>
                        <span class="info-label" style="font-size: 12px; color: var(--text-muted); display: block;">Tên công ty</span>
                        <strong style="color: var(--text-primary); font-size: 15px;">{{ auth.currentUser()?.companyName || 'Chưa cập nhật' }}</strong>
                      </div>
                      <div>
                        <span class="info-label" style="font-size: 12px; color: var(--text-muted); display: block;">Lĩnh vực hoạt động</span>
                        <strong style="color: var(--text-primary); font-size: 15px;">{{ auth.currentUser()?.companyIndustry || 'Chưa cập nhật' }}</strong>
                      </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                      <div>
                        <span class="info-label" style="font-size: 12px; color: var(--text-muted); display: block;">Quy mô</span>
                        <strong style="color: var(--text-primary); font-size: 15px;">{{ auth.currentUser()?.companySize || 'Chưa cập nhật' }}</strong>
                      </div>
                      <div>
                        <span class="info-label" style="font-size: 12px; color: var(--text-muted); display: block;">Địa chỉ</span>
                        <strong style="color: var(--text-primary); font-size: 15px;">{{ auth.currentUser()?.companyLocation || 'Chưa cập nhật' }}</strong>
                      </div>
                    </div>
                    
                    <div>
                      <span class="info-label" style="font-size: 12px; color: var(--text-muted); display: block;">Website</span>
                      @if (auth.currentUser()?.companyWebsite && auth.currentUser()?.companyWebsite !== '#') {
                        <a [href]="auth.currentUser()?.companyWebsite" target="_blank" style="color: var(--primary-light); text-decoration: underline; font-weight: 600; font-size: 14px;">{{ auth.currentUser()?.companyWebsite }}</a>
                      } @else {
                        <strong style="color: var(--text-primary); font-size: 14px;">Chưa cập nhật</strong>
                      }
                    </div>
                    
                    <div>
                      <span class="info-label" style="font-size: 12px; color: var(--text-muted); display: block; margin-bottom: 4px;">Giới thiệu công ty</span>
                      <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin: 0; background: rgba(255,255,255,0.03); padding: var(--space-3); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                        {{ auth.currentUser()?.companyDescription || 'Chưa cập nhật giới thiệu chi tiết về công ty.' }}
                      </p>
                    </div>
                  </div>
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
                      <div class="cv-actions" style="display: flex; gap: 8px;">
                        @if (auth.currentUser()?.cvUrl) {
                          <a [href]="auth.currentUser()?.cvUrl" target="_blank" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 13px;">
                            <span class="material-icons-round" style="font-size:16px">visibility</span> Xem CV
                          </a>
                        }
                        <button class="btn btn-secondary btn-sm" (click)="cvInput.click()">
                          <span class="material-icons-round" style="font-size:16px">edit</span> Sửa
                        </button>
                        <button class="btn btn-secondary btn-sm" (click)="onRemoveCV()">
                          <span class="material-icons-round" style="font-size:16px">delete</span> Xóa
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="upload-area" (click)="cvInput.click()" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
                      <span class="material-icons-round upload-icon">cloud_upload</span>
                      <p><strong>Click để tải lên</strong> hoặc kéo thả file vào đây</p>
                      <span class="upload-note">Hỗ trợ: PDF, DOC, DOCX (max 10MB)</span>
                    </div>
                  }
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
                      <p>Hồ sơ eKYC của bạn đang được hệ thống tự động kiểm tra.</p>
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

                @if (auth.currentUser()?.ekycStatus !== 'verified') {
                  <div class="ekyc-form" style="position: relative;">
                    
                    <!-- Scanning Loading Overlay -->
                    @if (ekycSubmitting()) {
                      <div class="ekyc-scanning-overlay">
                        <div class="scanner-box">
                          @if (selfiePreview()) {
                            <img [src]="selfiePreview()" alt="Scanning" style="width:120px; height:120px; border-radius:50%; object-fit:cover; border:3px solid var(--primary-light)" />
                          } @else {
                            <span class="material-icons-round scanner-logo">face</span>
                          }
                          <div class="laser-beam"></div>
                        </div>
                        <div class="upload-spinner" style="margin-bottom:12px"></div>
                        <p class="scanning-text">Đang đối chiếu dữ liệu khuôn mặt và kiểm tra tính hợp lệ của CCCD...</p>
                      </div>
                    }

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); flex-wrap: wrap;">
                      <!-- Cột 1: Giấy tờ CCCD -->
                      <div>
                        <h4 style="margin-bottom:12px; color: var(--text-primary);">1. Tải lên ảnh CCCD (2 mặt)</h4>
                        <div class="upload-previews" style="grid-template-columns: 1fr; gap:12px;">
                          <div class="upload-preview" (click)="ekycFrontInput.click()" style="min-height: 120px; height:120px">
                            @if (ekycFrontPreview()) {
                              <img [src]="ekycFrontPreview()" alt="CCCD Mặt trước" class="preview-image" style="height:100px" />
                              <span class="preview-label">Mặt trước ✓</span>
                            } @else {
                              <div class="preview-placeholder">
                                <span class="material-icons-round">add_a_photo</span>
                                <span>Mặt trước CCCD</span>
                              </div>
                            }
                          </div>
                          <div class="upload-preview" (click)="ekycBackInput.click()" style="min-height: 120px; height:120px">
                            @if (ekycBackPreview()) {
                              <img [src]="ekycBackPreview()" alt="CCCD Mặt sau" class="preview-image" style="height:100px" />
                              <span class="preview-label">Mặt sau ✓</span>
                            } @else {
                              <div class="preview-placeholder">
                                <span class="material-icons-round">add_a_photo</span>
                                <span>Mặt sau CCCD</span>
                              </div>
                            }
                          </div>
                        </div>
                        <input #ekycFrontInput type="file" accept="image/png,image/jpeg,image/jpg" style="display:none" (change)="onEkycFileSelected($event, 'front')">
                        <input #ekycBackInput type="file" accept="image/png,image/jpeg,image/jpg" style="display:none" (change)="onEkycFileSelected($event, 'back')">
                      </div>

                      <!-- Cột 2: Webcam Selfie -->
                      <div>
                        <h4 style="margin-bottom:12px; color: var(--text-primary);">2. Chụp ảnh Selfie đối chiếu</h4>
                        
                        <div class="selfie-camera-box" style="border: 2px dashed var(--border-color); border-radius: var(--radius-xl); height: 252px; background: rgba(255,255,255,0.02); display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; position:relative;">
                          @if (cameraErrorMessage()) {
                            <div class="p-4 text-center" style="color:var(--warning); font-size:12px; display:flex; flex-direction:column; align-items:center; gap:8px">
                              <span class="material-icons-round" style="font-size:32px">videocam_off</span>
                              <span>{{ cameraErrorMessage() }}</span>
                            </div>
                          } @else if (selfiePreview()) {
                            <img [src]="selfiePreview()" alt="Selfie Preview" style="width:100%; height:100%; object-fit:cover" />
                            <span class="preview-label" style="position:absolute; bottom:0; left:0; right:0;">Ảnh chụp chân dung ✓</span>
                          } @else if (isCameraActive()) {
                            <video id="webcamVideo" autoplay playsinline style="width:100%; height:100%; object-fit:cover"></video>
                            <button type="button" class="btn btn-primary btn-sm" (click)="captureSelfie()" style="position:absolute; bottom:12px; background:rgba(79,70,229,0.95); border:none; box-shadow:0 4px 10px rgba(0,0,0,0.3)">
                              <span class="material-icons-round">photo_camera</span> Chụp ảnh
                            </button>
                          } @else {
                            <div class="text-center" style="display:flex; flex-direction:column; align-items:center; gap:12px">
                              <span class="material-icons-round" style="font-size:48px; color:var(--text-muted)">face</span>
                              <button type="button" class="btn btn-secondary btn-sm" (click)="startCamera()">
                                <span class="material-icons-round" style="font-size:16px; vertical-align:middle">videocam</span> Bật Camera
                              </button>
                            </div>
                          }
                        </div>
                        
                        @if (selfiePreview()) {
                          <div style="text-align:center; margin-top:8px">
                            <button type="button" class="btn btn-secondary btn-sm" (click)="retakeSelfie()" style="padding: 4px 12px; font-size:12px">
                              <span class="material-icons-round" style="font-size:14px; vertical-align:middle">sync</span> Chụp lại
                            </button>
                          </div>
                        }
                      </div>
                    </div>

                    <p class="upload-hint" style="margin-top:16px;">Hệ thống sử dụng camera của bạn để đối chiếu sinh trắc học với ảnh thẻ CCCD.</p>

                    <button class="btn btn-primary btn-lg full-width"
                            [disabled]="!ekycFrontPreview() || !ekycBackPreview() || !selfiePreview() || ekycSubmitting() || !!cameraErrorMessage()"
                            (click)="onSubmitEkyc()">
                      <span class="material-icons-round">verified</span> Gửi xác thực tự động
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
                            } @else if (job.status === 'disputed') {
                              <span class="badge badge-danger" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600;">Tranh chấp</span>
                            }
                          </div>
                          @if (job.status === 'in_progress') {
                            <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center; margin-top: 8px; flex-wrap: wrap;">
                              @if (!job.checkInTime) {
                                <button type="button" class="btn btn-primary btn-sm" (click)="openCheckInModal(job)" style="background: var(--primary-light)">
                                  <span class="material-icons-round" style="font-size:16px">login</span> Check-in OTP
                                </button>
                              } @else if (!job.checkOutTime) {
                                <div style="display: flex; gap: 8px; align-items: center;">
                                  <span style="font-size: 11.5px; color: var(--success); font-weight: 500; display: flex; align-items: center; gap: 2px;">
                                    <span class="material-icons-round" style="font-size:14px">check_circle</span> Đã check-in
                                  </span>
                                  <button type="button" class="btn btn-warning btn-sm" (click)="openCheckOutModal(job)">
                                    <span class="material-icons-round" style="font-size:16px">logout</span> Check-out OTP
                                  </button>
                                </div>
                              }
                              <button type="button" class="btn btn-success btn-sm" (click)="selectedJobToComplete.set(job)">
                                <span class="material-icons-round" style="font-size:16px">task_alt</span> Báo cáo hoàn thành
                              </button>
                            </div>
                          }
                          @if (job.status === 'disputed') {
                            <div class="dispute-box" style="margin-top: 8px; padding: 16px; background: rgba(239, 68, 68, 0.05); border: 1px dashed rgba(239, 68, 68, 0.2); border-radius: var(--radius-lg);">
                              <div style="margin-bottom: 12px; font-size: 13px;">
                                <strong style="color: #EF4444; display: flex; align-items: center; gap: 4px;">
                                  <span class="material-icons-round" style="font-size: 18px;">warning</span> Nhà tuyển dụng từ chối thanh toán:
                                </strong>
                                <p style="margin: 6px 0; color: var(--text-secondary);"><strong>Lý do:</strong> {{ job.disputeReason || 'Không có lý do chi tiết' }}</p>
                                @if (job.employerEvidenceText) {
                                  <p style="margin: 6px 0; color: var(--text-secondary);"><strong>Mô tả của NTD:</strong> {{ job.employerEvidenceText }}</p>
                                }
                                @if (job.employerEvidenceUrl) {
                                  <a [href]="job.employerEvidenceUrl" target="_blank" style="color: var(--primary-light); text-decoration: underline; font-weight: 500;">Xem bằng chứng từ NTD</a>
                                }
                              </div>

                              @if (!job.studentEvidenceText) {
                                <div style="margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px;">
                                  <strong style="font-size: 13px; color: var(--text-primary); display: block; margin-bottom: 8px;">Cung cấp bằng chứng bảo vệ quyền lợi của bạn:</strong>
                                  <div class="form-group" style="margin-bottom: 8px;">
                                    <textarea class="form-textarea" rows="2" style="font-size: 13px; padding: 8px;"
                                              placeholder="Nhập mô tả bằng chứng của bạn (VD: tôi đã làm xong đúng hạn, hình ảnh chat...)"
                                              [(ngModel)]="studentEvidenceTexts[job.id]"
                                              name="studentEvText-{{job.id}}"></textarea>
                                  </div>
                                  <div class="form-group" style="margin-bottom: 12px;">
                                    <input type="text" class="form-input" style="font-size: 13px; padding: 8px;"
                                           placeholder="Link hình ảnh/video bằng chứng (nếu có)"
                                           [(ngModel)]="studentEvidenceUrls[job.id]"
                                           name="studentEvUrl-{{job.id}}">
                                  </div>
                                  <div style="text-align: right;">
                                    <button class="btn btn-primary btn-sm" (click)="submitEvidence(job.id)">
                                      <span class="material-icons-round" style="font-size: 16px;">send</span> Gửi bằng chứng
                                    </button>
                                  </div>
                                </div>
                              } @else {
                                <div style="margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; font-size: 13px;">
                                  <strong style="color: var(--success); display: flex; align-items: center; gap: 4px;">
                                    <span class="material-icons-round" style="font-size: 18px;">check_circle</span> Bằng chứng bạn đã nộp:
                                  </strong>
                                  <p style="margin: 6px 0; color: var(--text-secondary);">{{ job.studentEvidenceText }}</p>
                                  @if (job.studentEvidenceUrl) {
                                    <a [href]="job.studentEvidenceUrl" target="_blank" style="color: var(--primary-light); text-decoration: underline; font-weight: 500;">Link bằng chứng đã gửi</a>
                                  }
                                  <div style="margin-top: 12px; color: var(--warning); display: flex; align-items: center; gap: 4px; font-weight: 600;">
                                    <span class="material-icons-round" style="font-size: 16px;">hourglass_top</span>
                                    <span>Đang chờ Admin xét duyệt tranh chấp.</span>
                                  </div>
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="empty-applied">
                      <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">work_outline</span>
                      <p>Bạn chưa có công việc nào đang thực hiện</p>
                    </div>
                  }
                </div>
              }

              <!-- Job History (Student) -->
              @if (auth.isStudent()) {
                <div class="history-section glass-card animate-fade-in-up" style="animation-delay:0.19s">
                  <h3><span class="material-icons-round">history_edu</span> Lịch sử công việc</h3>
                  @if (completedJobsHistory().length) {
                    <div class="applied-list">
                      @for (job of completedJobsHistory(); track job.id) {
                        <div class="applied-item" style="flex-direction: column; align-items: stretch; gap: 8px">
                          <div style="display:flex; justify-content:space-between; align-items:flex-start">
                            <div class="applied-info">
                              <a [routerLink]="['/jobs', job.id]" style="text-decoration:none; color:inherit">
                                <strong style="font-size:16px">{{ job.title }}</strong>
                              </a>
                              <span>{{ job.company }} • 💰 {{ job.budget?.toLocaleString('vi-VN') }}đ</span>
                            </div>
                            @if (job.status === 'completed') {
                              <span class="badge badge-success">Đã hoàn thành</span>
                            } @else if (job.status === 'closed') {
                              <span class="badge badge-danger" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600;">Chưa hoàn thành</span>
                            }
                          </div>
                          @if (job.status === 'completed') {
                            <div style="text-align: right; margin-top: 8px;">
                              <button type="button" class="btn btn-primary btn-sm" (click)="openReviewModal(job)">
                                <span class="material-icons-round" style="font-size:16px">star</span> Đánh giá nhà tuyển dụng
                              </button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="empty-applied">
                      <span class="material-icons-round" style="font-size:48px;color:var(--text-muted)">history_toggle_off</span>
                      <p>Chưa có lịch sử công việc hoàn thành</p>
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

      <!-- Withdraw Modal -->
      @if (showWithdrawModal()) {
        <div class="modal-overlay animate-fade-in">
          <div class="modal-content glass-card p-6" style="width: 100%; max-width: 450px;">
            <div class="modal-header d-flex justify-between items-center mb-6">
              <h3 style="font-size:1.25rem; font-weight:700">Rút tiền về tài khoản</h3>
              <button class="btn btn-secondary icon-btn" (click)="showWithdrawModal.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </div>
            <form (ngSubmit)="onSubmitWithdraw()">
              <div class="form-group mb-4">
                <label class="form-label">Số tiền rút (Tối thiểu 10.000đ, Tối đa {{ (auth.currentUser()?.balance || 0).toLocaleString('vi-VN') }}đ) *</label>
                <input type="text" class="form-input" [(ngModel)]="withdrawForm.amount" name="amount" placeholder="Ví dụ: 100.000" required>
              </div>
              <div class="form-group mb-4">
                <label class="form-label">Ngân hàng thụ hưởng *</label>
                <select class="form-select" [(ngModel)]="withdrawForm.bank" name="bank" required>
                  <option value="" disabled selected>Chọn ngân hàng</option>
                  <option value="VCB">Vietcombank (VCB)</option>
                  <option value="TCB">Techcombank (TCB)</option>
                  <option value="MB">MBBank (MB)</option>
                  <option value="ICB">VietinBank (ICB)</option>
                  <option value="BIDV">BIDV</option>
                  <option value="VBA">Agribank (VBA)</option>
                  <option value="ACB">ACB</option>
                  <option value="TPB">TPBank (TPB)</option>
                  <option value="VPB">VPBank (VPB)</option>
                  <option value="STB">Sacombank (STB)</option>
                  <option value="HDB">HDBank (HDB)</option>
                  <option value="SHB">SHB</option>
                  <option value="VIB">VIB</option>
                  <option value="MSB">MSB</option>
                  <option value="OCB">OCB</option>
                  <option value="LPB">LPBank (LPB)</option>
                </select>
              </div>
              <div class="form-group mb-4">
                <label class="form-label">Số tài khoản *</label>
                <input type="text" class="form-input" [(ngModel)]="withdrawForm.account" name="account" required>
              </div>
              <div class="form-group mb-6">
                <label class="form-label">Tên chủ tài khoản *</label>
                <input type="text" class="form-input" [(ngModel)]="withdrawForm.name" name="name" required style="text-transform:uppercase">
              </div>
              <div class="form-actions d-flex justify-between gap-3">
                <button type="button" class="btn btn-secondary flex-1" (click)="showWithdrawModal.set(false)">Hủy</button>
                <button type="submit" class="btn btn-primary flex-1" [disabled]="!withdrawForm.amount || !withdrawForm.bank || !withdrawForm.account || !withdrawForm.name">
                  Xác nhận rút tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Confirm Complete Modal -->
      @if (selectedJobToComplete()) {
        <div class="modal-overlay animate-fade-in">
          <div class="modal-content glass-card p-6" style="width: 100%; max-width: 450px; text-align: center;">
            <span class="material-icons-round" style="font-size:64px; color:var(--success); margin-bottom:16px">task_alt</span>
            <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px">Xác nhận hoàn thành</h3>
            <p style="color:var(--text-secondary); margin-bottom:24px">Bạn xác nhận đã hoàn thành công việc <strong>{{ selectedJobToComplete()?.title }}</strong>? Yêu cầu nghiệm thu sẽ được gửi đến Nhà tuyển dụng.</p>
            <div class="form-actions d-flex justify-center gap-3">
              <button class="btn btn-secondary" (click)="selectedJobToComplete.set(null)">Hủy</button>
              <button class="btn btn-primary" (click)="studentCompleteJob(selectedJobToComplete()!)">Xác nhận</button>
            </div>
          </div>
        </div>
      }

      <!-- Check-in OTP Modal -->
      @if (showCheckInModal()) {
        <div class="modal-overlay animate-fade-in" (click)="showCheckInModal.set(false)">
          <div class="modal-content glass-card p-6" (click)="$event.stopPropagation()" style="width: 100%; max-width: 400px;">
            <div class="d-flex justify-between items-center mb-4">
              <h3 style="font-size:1.2rem; font-weight:700; color:var(--text-primary);">Xác thực Check-in</h3>
              <button class="icon-btn" (click)="showCheckInModal.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </div>
            <p class="mb-4" style="font-size: 14px; color: var(--text-secondary)">Nhập mã OTP gồm 6 chữ số do Nhà tuyển dụng cung cấp để tiến hành check-in công việc <strong>{{ selectedJobForOtp()?.title }}</strong>.</p>
            <form (ngSubmit)="submitCheckIn()">
              <div class="form-group mb-6">
                <label class="form-label" style="color:var(--text-primary)">Mã OTP Check-in *</label>
                <input type="text" class="form-input" [(ngModel)]="otpInput" name="otpInput" maxlength="6" placeholder="Nhập 6 chữ số OTP" required style="text-align: center; font-size: 20px; letter-spacing: 4px; font-weight: bold; color:var(--text-primary); background:rgba(255,255,255,0.05); border:1px solid var(--border-color);">
              </div>
              <div class="form-actions d-flex justify-between gap-3">
                <button type="button" class="btn btn-secondary flex-1" (click)="showCheckInModal.set(false)">Hủy</button>
                <button type="submit" class="btn btn-primary flex-1" [disabled]="otpInput.length < 6" style="background: var(--success)">
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Check-out OTP Modal -->
      @if (showCheckOutModal()) {
        <div class="modal-overlay animate-fade-in" (click)="showCheckOutModal.set(false)">
          <div class="modal-content glass-card p-6" (click)="$event.stopPropagation()" style="width: 100%; max-width: 400px;">
            <div class="d-flex justify-between items-center mb-4">
              <h3 style="font-size:1.2rem; font-weight:700; color:var(--text-primary);">Xác thực Check-out</h3>
              <button class="icon-btn" (click)="showCheckOutModal.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </div>
            <p class="mb-4" style="font-size: 14px; color: var(--text-secondary)">Nhập mã OTP gồm 6 chữ số do Nhà tuyển dụng cung cấp để tiến hành check-out và hoàn thành công việc <strong>{{ selectedJobForOtp()?.title }}</strong>.</p>
            <form (ngSubmit)="submitCheckOut()">
              <div class="form-group mb-6">
                <label class="form-label" style="color:var(--text-primary)">Mã OTP Check-out *</label>
                <input type="text" class="form-input" [(ngModel)]="otpInput" name="otpInput" maxlength="6" placeholder="Nhập 6 chữ số OTP" required style="text-align: center; font-size: 20px; letter-spacing: 4px; font-weight: bold; color:var(--text-primary); background:rgba(255,255,255,0.05); border:1px solid var(--border-color);">
              </div>
              <div class="form-actions d-flex justify-between gap-3">
                <button type="button" class="btn btn-secondary flex-1" (click)="showCheckOutModal.set(false)">Hủy</button>
                <button type="submit" class="btn btn-primary flex-1" [disabled]="otpInput.length < 6" style="background: var(--warning)">
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Rating/Review Employer Modal -->
      @if (showReviewModal()) {
        <div class="modal-overlay animate-fade-in" (click)="showReviewModal.set(false)">
          <div class="modal-content glass-card p-6" (click)="$event.stopPropagation()" style="width: 100%; max-width: 500px;">
            <div class="d-flex justify-between items-center mb-4">
              <h3 style="font-size:1.2rem; font-weight:700; color:var(--text-primary);">Đánh giá nhà tuyển dụng</h3>
              <button class="icon-btn" (click)="showReviewModal.set(false)">
                <span class="material-icons-round">close</span>
              </button>
            </div>
            <p class="mb-4" style="font-size: 14px; color: var(--text-secondary)">
              Đánh giá trải nghiệm làm việc của bạn cho công việc <strong>{{ selectedJobForReview()?.title }}</strong>. Đánh giá của bạn sẽ giúp tăng độ minh bạch của hệ thống.
            </p>
            <form (ngSubmit)="submitReview()">
              <!-- Rating stars selection -->
              <div class="form-group mb-4 text-center">
                <label class="form-label" style="display:block; text-align:center; color:var(--text-primary)">Số sao (1 - 5) *</label>
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 8px;">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <button type="button" (click)="reviewRating = star" style="background: none; border: none; cursor: pointer; padding: 4px;">
                      <span class="material-icons-round" [style.color]="star <= reviewRating ? 'var(--warning)' : 'var(--text-muted)'" style="font-size: 36px;">
                        {{ star <= reviewRating ? 'star' : 'star_border' }}
                      </span>
                    </button>
                  }
                </div>
              </div>
              
              <!-- Tags Selection checklist -->
              <div class="form-group mb-4">
                <label class="form-label" style="color:var(--text-primary)">Chọn thẻ nhận xét tiêu biểu *</label>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                  @for (tag of reviewTagsList; track tag) {
                    <button type="button" class="btn btn-sm"
                            [style.background]="reviewTagsSelected.includes(tag) ? 'rgba(79, 70, 229, 0.2)' : 'rgba(255,255,255,0.05)'"
                            [style.border]="reviewTagsSelected.includes(tag) ? '1px solid var(--primary-light)' : '1px solid var(--border-color)'"
                            [style.color]="reviewTagsSelected.includes(tag) ? 'var(--primary-light)' : 'var(--text-secondary)'"
                            (click)="toggleReviewTag(tag)"
                            style="border-radius: var(--radius-full); padding: 6px 12px; font-weight: 500; font-size: 12.5px;">
                      {{ tag }}
                    </button>
                  }
                </div>
              </div>

              <!-- Comment input -->
              <div class="form-group mb-6">
                <label class="form-label" style="color:var(--text-primary)">Nhận xét chi tiết</label>
                <textarea class="form-textarea" rows="3" [(ngModel)]="reviewComment" name="reviewComment" placeholder="Nhập thêm nhận xét chi tiết của bạn về nhà tuyển dụng này (không bắt buộc)..." style="color:var(--text-primary); background:rgba(255,255,255,0.05); border:1px solid var(--border-color);"></textarea>
              </div>

              <div class="form-actions d-flex justify-between gap-3">
                <button type="button" class="btn btn-secondary flex-1" (click)="showReviewModal.set(false)">Hủy</button>
                <button type="submit" class="btn btn-primary flex-1">
                  Gửi đánh giá
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Custom eKYC Error Modal -->
      @if (showEkycErrorModal()) {
        <div class="modal-overlay animate-fade-in" style="z-index: 1100;">
          <div class="modal-content glass-card p-6" style="width: 100%; max-width: 450px; text-align: center; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(18, 18, 24, 0.9);">
            <span class="material-icons-round" style="font-size:64px; color:#EF4444; margin-bottom:16px">error_outline</span>
            <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:12px; color:#EF4444">Xác thực thất bại</h3>
            <p style="color:var(--text-secondary); margin-bottom:24px; font-size:14px; line-height: 1.6;">
              {{ ekycErrorMessage() }}
            </p>
            <div class="d-flex justify-center">
              <button class="btn btn-primary" style="background:#EF4444; border-color:#EF4444; color:white; width:100%" (click)="showEkycErrorModal.set(false)">
                <span class="material-icons-round" style="font-size:16px; vertical-align:middle">sync</span> Thử lại
              </button>
            </div>
          </div>
        </div>
      }
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

    .profile-avatar-wrapper {
      position: relative;
      width: 88px;
      height: 88px;
      margin: 0 auto var(--space-4);
    }

    .profile-avatar {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-2xl);
      font-weight: 800;
      color: white;
      box-shadow: 0 0 30px rgba(79, 70, 229, 0.3);
    }

    .profile-avatar-img {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 0 30px rgba(79, 70, 229, 0.3);
    }

    .avatar-upload-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--primary);
      border: 2px solid var(--bg-card);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .avatar-upload-btn:hover { background: var(--primary-dark); transform: scale(1.1); }
    .avatar-upload-btn:disabled { opacity: 0.5; cursor: wait; }
    .avatar-upload-btn .material-icons-round { font-size: 16px; }

    .mini-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .upload-spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid var(--border-color);
      border-top-color: var(--primary-light);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

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
      margin-bottom: var(--space-4);
    }

    .upload-preview {
      cursor: pointer;
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 2px dashed var(--border-color);
      transition: all var(--transition-fast);
      position: relative;
      min-height: 140px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .upload-preview:hover {
      border-color: var(--primary-light);
      background: rgba(79, 70, 229, 0.05);
    }

    .preview-image {
      width: 100%;
      height: 160px;
      object-fit: cover;
      display: block;
    }

    .preview-label {
      display: block;
      text-align: center;
      padding: var(--space-2);
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--success);
      background: rgba(16, 185, 129, 0.1);
    }

    .upload-hint {
      text-align: center;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-bottom: var(--space-4);
    }

    .preview-placeholder {
      padding: var(--space-6);
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      color: var(--text-muted);
      font-size: var(--font-size-xs);
      width: 100%;
      height: 100%;
      justify-content: center;
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
    }

    /* Utility classes for modal */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content { background: var(--bg-card); padding: var(--space-6); border-radius: var(--radius-xl); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
    .d-flex { display: flex; } .flex-col { flex-direction: column; }
    .justify-between { justify-content: space-between; } .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .gap-3 { gap: 12px; } .gap-4 { gap: 16px; }
    .p-4 { padding: 16px; } .p-6 { padding: 24px; } .p-8 { padding: 32px; }
    .mb-4 { margin-bottom: 16px; } .mb-6 { margin-bottom: 24px; } .mt-2 { margin-top: 8px; }
    .rounded-lg { border-radius: 8px; }
    .flex-1 { flex: 1; }
    .icon-btn { padding: 4px; display: flex; align-items: center; justify-content: center; background:transparent; border:none; color:var(--text-muted); cursor:pointer; }
    .icon-btn:hover { color:var(--text-primary); }

    /* eKYC Scanning Overlay */
    .ekyc-scanning-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 10, 15, 0.85);
      backdrop-filter: blur(8px);
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-xl);
      padding: var(--space-6);
    }
    
    .scanner-box {
      position: relative;
      margin-bottom: var(--space-6);
      width: 140px;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(255,255,255,0.02);
    }
    
    .scanner-logo {
      font-size: 64px;
      color: var(--primary-light);
    }
    
    .laser-beam {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: #10B981;
      box-shadow: 0 0 15px #10B981, 0 0 30px #10B981;
      border-radius: var(--radius-full);
      animation: scanEffect 2s linear infinite;
    }
    
    @keyframes scanEffect {
      0% { top: 0%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    
    .scanning-text {
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      text-align: center;
      font-weight: 500;
      max-width: 280px;
      line-height: 1.5;
    }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private jobService = inject(JobService);
  private toast = inject(ToastService);

  isEditing = signal(false);
  editSuccess = signal(false);
  editMessage = signal('');
  
  showWithdrawModal = signal(false);
  selectedJobToComplete = signal<Job | null>(null);

  showCheckInModal = signal(false);
  showCheckOutModal = signal(false);
  showReviewModal = signal(false);
  selectedJobForOtp = signal<Job | null>(null);
  selectedJobForReview = signal<Job | null>(null);
  otpInput = '';
  reviewRating = 5;
  reviewComment = '';
  reviewTagsSelected: string[] = [];
  reviewTagsList = [
    'Thanh toán nhanh',
    'Thân thiện',
    'Hỗ trợ tốt',
    'Mô tả đúng việc',
    'Đúng giờ',
    'Chuyên nghiệp',
    'Địa điểm dễ tìm'
  ];
  
  withdrawForm = {
    amount: '' as any,
    bank: '',
    account: '',
    name: ''
  };

  myApplications = signal<any[]>([]);
  studentEvidenceTexts: Record<number, string> = {};
  studentEvidenceUrls: Record<number, string> = {};

  workingJobs = computed(() => {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'student') return [];
    
    const acceptedJobIds = this.myApplications()
      .filter(app => app.status === 2 || app.status === 'Accepted' || app.status === 'accepted')
      .map(app => app.jobId);

    return this.jobService.getAllJobs().filter(j => 
      (j.selectedStudentId === user.id || 
       (j.selectedStudentId && String(j.selectedStudentId) === String(user.id)) ||
       acceptedJobIds.includes(j.id)) &&
      (j.status === 'in_progress' || j.status === 'pending_confirmation' || j.status === 'disputed')
    );
  });

  completedJobsHistory = computed(() => {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'student') return [];
    
    const acceptedJobIds = this.myApplications()
      .filter(app => app.status === 2 || app.status === 'Accepted' || app.status === 'accepted')
      .map(app => app.jobId);

    return this.jobService.getAllJobs().filter(j => 
      (j.selectedStudentId === user.id || 
       (j.selectedStudentId && String(j.selectedStudentId) === String(user.id)) ||
       acceptedJobIds.includes(j.id)) &&
      (j.status === 'completed' || j.status === 'closed')
    );
  });

  appliedJobs = computed(() => {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'student') return [];
    
    const excludedJobIds = [
      ...this.workingJobs().map(j => j.id),
      ...this.completedJobsHistory().map(j => j.id)
    ];

    const appliedJobIds = this.myApplications()
      .filter(app => !excludedJobIds.includes(app.jobId))
      .map(app => app.jobId);

    return this.jobService.getAllJobs().filter(j => appliedJobIds.includes(j.id));
  });

  editForm = {
    fullName: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    email: '',
    university: '',
    major: '',
    year: 3,
    skillsStr: '',
    bio: '',
    // Employer fields
    companyName: '',
    position: '',
    companyIndustry: '',
    companySize: '',
    companyLocation: '',
    companyDescription: '',
    companyWebsite: ''
  };

  constructor() {
  }

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.auth.fetchProfile().subscribe();
      this.auth.fetchBalance().subscribe();
      this.jobService.fetchJobs();
      this.refreshStudentApplications();
    }
  }

  refreshStudentApplications() {
    if (this.auth.isStudent()) {
      this.jobService.getMyApplications().subscribe({
        next: (apps) => this.myApplications.set(apps),
        error: (err) => console.error('Failed to load student applications:', err)
      });
    }
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
          email: user.email || '',
          university: user.university || '',
          major: user.major || '',
          year: user.year || 3,
          skillsStr: (user.skills || []).join(', '),
          bio: user.bio || '',
          companyName: user.companyName || '',
          position: user.position || '',
          companyIndustry: user.companyIndustry || '',
          companySize: user.companySize || '',
          companyLocation: user.companyLocation || '',
          companyDescription: user.companyDescription || '',
          companyWebsite: user.companyWebsite || ''
        };
      }
    }
  }

  onSaveProfile() {
    const payload: any = {
      fullName: this.editForm.fullName,
      phone: this.editForm.phone,
      dateOfBirth: this.editForm.dateOfBirth || undefined,
      address: this.editForm.address || undefined,
    };

    if (this.auth.isStudent()) {
      payload.university = this.editForm.university || undefined;
      payload.major = this.editForm.major || undefined;
      payload.year = Number(this.editForm.year);
      payload.skills = this.editForm.skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      payload.bio = this.editForm.bio || undefined;
    } else if (this.auth.isAdmin()) {
      payload.email = this.editForm.email;
    } else {
      payload.companyName = this.editForm.companyName || undefined;
      payload.position = this.editForm.position || undefined;
      payload.companyIndustry = this.editForm.companyIndustry || undefined;
      payload.companySize = this.editForm.companySize || undefined;
      payload.companyLocation = this.editForm.companyLocation || undefined;
      payload.companyDescription = this.editForm.companyDescription || undefined;
      payload.companyWebsite = this.editForm.companyWebsite || undefined;
    }

    this.auth.updateProfile(payload).subscribe({
      next: (result) => {
        if (result.success) {
          this.auth.fetchProfile().subscribe(); // Sync profile from database
          this.editSuccess.set(true);
          this.editMessage.set(result.message);
          setTimeout(() => {
            this.editSuccess.set(false);
            this.isEditing.set(false);
            this.toast.success('Hồ sơ đã được cập nhật thành công.');
          }, 1500);
        } else {
          this.toast.error(result.message);
        }
      },
      error: () => this.toast.error('Có lỗi xảy ra khi lưu hồ sơ.')
    });
  }

  onSubmitWithdraw() {
    let amountStr = String(this.withdrawForm.amount || '').trim();
    // If there is a decimal comma/dot followed by cents (e.g. ,00 or .00 at the end), remove it
    amountStr = amountStr.replace(/[,.]00$/, '');
    // Strip all remaining non-digits
    amountStr = amountStr.replace(/\D/g, '');
    const amount = Number(amountStr);

    if (!amount || isNaN(amount) || amount < 10000) {
      this.toast.error('Số tiền rút tối thiểu là 10.000đ');
      return;
    }
    const user = this.auth.currentUser();
    const balance = user?.balance || 0;
    if (amount > balance) {
      this.toast.error(`Số dư không đủ! Bạn chỉ có thể rút tối đa ${balance.toLocaleString('vi-VN')}đ`);
      return;
    }

    this.auth.withdraw(
      amount,
      this.withdrawForm.bank,
      this.withdrawForm.account,
      this.withdrawForm.name
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Yêu cầu rút tiền thành công! Tiền sẽ được chuyển trong 24h.');
          this.showWithdrawModal.set(false);
          this.withdrawForm = { amount: '' as any, bank: '', account: '', name: '' };
        } else {
          this.toast.error('Có lỗi xảy ra: ' + res.message);
        }
      },
      error: () => this.toast.error('Lỗi kết nối máy chủ.')
    });
  }

  // Phase 4: Student confirms completion
  studentCompleteJob(job: Job) {
    this.jobService.completeJob(job.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(`Báo cáo thành công! Số tiền ${(job.budget || 0).toLocaleString('vi-VN')}đ sẽ được chuyển vào tài khoản sau khi nghiệm thu.`);
          this.selectedJobToComplete.set(null);
          this.refreshStudentApplications();
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => this.toast.error('Lỗi kết nối khi báo cáo.')
    });
  }

  openCheckInModal(job: Job) {
    this.selectedJobForOtp.set(job);
    this.otpInput = '';
    this.showCheckInModal.set(true);
  }

  openCheckOutModal(job: Job) {
    this.selectedJobForOtp.set(job);
    this.otpInput = '';
    this.showCheckOutModal.set(true);
  }

  submitCheckIn() {
    const job = this.selectedJobForOtp();
    if (!job || !this.otpInput) return;
    this.jobService.studentCheckIn(job.id, this.otpInput).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(res.message);
          this.showCheckInModal.set(false);
          this.jobService.fetchJobs();
          this.refreshStudentApplications();
          this.auth.fetchProfile().subscribe();
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => this.toast.error('Lỗi kết nối máy chủ.')
    });
  }

  submitCheckOut() {
    const job = this.selectedJobForOtp();
    if (!job || !this.otpInput) return;
    this.jobService.studentCheckOut(job.id, this.otpInput).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(res.message);
          this.showCheckOutModal.set(false);
          this.jobService.fetchJobs();
          this.refreshStudentApplications();
          this.auth.fetchProfile().subscribe();
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => this.toast.error('Lỗi kết nối máy chủ.')
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
    this.jobService.submitReview(job.id, 'student', this.reviewRating, this.reviewTagsSelected, this.reviewComment).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(res.message);
          this.showReviewModal.set(false);
          this.jobService.fetchJobs();
          this.refreshStudentApplications();
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => this.toast.error('Lỗi gửi đánh giá.')
    });
  }

  submitEvidence(jobId: number) {
    const text = this.studentEvidenceTexts[jobId] || '';
    const url = this.studentEvidenceUrls[jobId] || '';
    if (!text.trim()) {
      this.toast.warning('Vui lòng nhập mô tả bằng chứng.');
      return;
    }
    this.jobService.submitStudentEvidence(jobId, text, url).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Nộp bằng chứng thành công! Vui lòng chờ Admin xem xét.');
          this.jobService.fetchJobs();
          this.refreshStudentApplications();
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => this.toast.error('Gửi bằng chứng thất bại.')
    });
  }

  onCVSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.uploadingCV(file);
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
      this.uploadingCV(file);
    }
  }

  private uploadingCV(file: File) {
    this.toast.success('Đang tải CV lên, vui lòng đợi...');
    this.auth.uploadCV(file).subscribe({
      next: (res) => {
        if (res.success) {
           this.toast.success(res.message);
        } else {
           this.toast.error(res.message);
        }
      },
      error: () => this.toast.error('Lỗi kết nối máy chủ.')
    });
  }

  onRemoveCV() {
    this.auth.deleteCV().subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(res.message);
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => this.toast.error('Lỗi kết nối máy chủ.')
    });
  }

  avatarUploading = signal(false);
  ekycFrontPreview = signal<string>('');
  ekycBackPreview = signal<string>('');
  ekycFrontFile: File | null = null;
  ekycBackFile: File | null = null;
  uploadingFront = signal(false);
  uploadingBack = signal(false);
  ekycSubmitting = signal(false);

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.toast.warning('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
      return;
    }

    this.avatarUploading.set(true);
    this.auth.updateAvatarUrl(file).subscribe({
      next: (res) => {
        this.avatarUploading.set(false);
        if (res.success) {
          this.toast.success(res.message);
          // optimistically update preview locally
          const reader = new FileReader();
          reader.onload = () => {
             const user = this.auth.currentUser();
             if (user) {
               const updated = { ...user, avatarUrl: reader.result as string };
               this.auth.currentUser.set(updated);
             }
          };
          reader.readAsDataURL(file);
        } else {
          this.toast.error(res.message);
        }
      },
      error: () => {
        this.avatarUploading.set(false);
        this.toast.error('Upload ảnh thất bại do lỗi máy chủ.');
      }
    });
  }

  async onEkycFileSelected(event: Event, side: 'front' | 'back') {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.toast.warning('File quá lớn! Vui lòng chọn file nhỏ hơn 5MB.');
      return;
    }

    if (side === 'front') this.ekycFrontFile = file;
    else this.ekycBackFile = file;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => {
      if (side === 'front') this.ekycFrontPreview.set(reader.result as string);
      else this.ekycBackPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Webcam eKYC properties
  selfiePreview = signal<string>('');
  selfieFile: File | null = null;
  isCameraActive = signal(false);
  cameraErrorMessage = signal<string>('');
  private webMediaStream: MediaStream | null = null;
  ekycErrorMessage = signal<string>('');
  showEkycErrorModal = signal(false);

  async startCamera() {
    this.cameraErrorMessage.set('');
    this.isCameraActive.set(true);
    try {
      const constraints = {
        video: { width: 640, height: 480, facingMode: 'user' }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.webMediaStream = stream;
      
      setTimeout(() => {
        const video = document.getElementById('webcamVideo') as HTMLVideoElement;
        if (video) {
          video.srcObject = stream;
          video.play().catch(err => console.error("Error playing video stream:", err));
        }
      }, 100);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      this.isCameraActive.set(false);
      this.cameraErrorMessage.set(
        'Không tìm thấy camera hoặc quyền truy cập camera bị chặn. Vui lòng cấp quyền bật camera để chụp ảnh chân dung.'
      );
    }
  }

  stopCamera() {
    if (this.webMediaStream) {
      this.webMediaStream.getTracks().forEach(track => track.stop());
      this.webMediaStream = null;
    }
    this.isCameraActive.set(false);
  }

  captureSelfie() {
    const video = document.getElementById('webcamVideo') as HTMLVideoElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      this.selfiePreview.set(dataUrl);

      const blob = this.dataURLtoBlob(dataUrl);
      this.selfieFile = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      
      this.stopCamera();
    }
  }

  retakeSelfie() {
    this.selfiePreview.set('');
    this.selfieFile = null;
    this.startCamera();
  }

  private dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  onSubmitEkyc() {
    if (!this.ekycFrontFile || !this.ekycBackFile) {
      this.toast.warning('Vui lòng cung cấp đủ 2 mặt CCCD.');
      return;
    }
    if (!this.selfieFile) {
      this.toast.warning('Vui lòng chụp ảnh chân dung Selfie để đối chiếu.');
      return;
    }
    
    this.ekycSubmitting.set(true);
    this.ekycErrorMessage.set('');
    this.auth.submitEkyc(this.ekycFrontFile, this.ekycBackFile, this.selfieFile).subscribe({
      next: (res) => {
         this.ekycSubmitting.set(false);
         if (res.success) {
           this.toast.success(res.message);
           this.selfiePreview.set('');
           this.selfieFile = null;
           this.ekycFrontPreview.set('');
           this.ekycBackPreview.set('');
           this.ekycFrontFile = null;
           this.ekycBackFile = null;
           this.stopCamera();
         } else {
           this.ekycErrorMessage.set(res.message);
           this.showEkycErrorModal.set(true);
         }
      },
      error: (err) => {
         this.ekycSubmitting.set(false);
         const msg = err.error?.message || 'Gửi xác thực thất bại do lỗi máy chủ.';
         this.ekycErrorMessage.set(msg);
         this.showEkycErrorModal.set(true);
      }
    });
  }
}
