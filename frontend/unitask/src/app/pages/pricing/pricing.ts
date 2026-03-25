import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import ADMIN_DATA from '../../../assets/data/mock-admin.json';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="pricing-page">
      <div class="container" style="max-width: 900px;">
        
        <div class="text-center animate-fade-in-up">
          <h1 style="font-size:var(--font-size-3xl);font-weight:800;margin-bottom:var(--space-2)">
            Bảng giá & <span class="gradient-text">Nạp tiền</span>
          </h1>
          <p style="color:var(--text-secondary);max-width:600px;margin: 0 auto var(--space-8)">
            Mua các gói đăng tuyển có lợi hoặc nạp số dư vào tài khoản để trả phí theo từng tin đăng (200đ/tin).
          </p>
        </div>

        @if (!auth.isLoggedIn()) {
          <div class="auth-required glass-card animate-fade-in-up" style="margin-top:var(--space-8);text-align:center;padding:var(--space-10)">
            <span class="material-icons-round" style="font-size:64px;color:var(--primary-light)">lock</span>
            <h2>Vui lòng đăng nhập</h2>
            <p style="color:var(--text-secondary);margin-bottom:var(--space-4)">Bạn cần đăng nhập bằng tài khoản nhà tuyển dụng để thao tác.</p>
            <a routerLink="/login" class="btn btn-primary btn-lg">Đăng nhập ngay</a>
          </div>
        } @else {
          
          <div class="account-balance glass-card animate-fade-in-up" style="animation-delay:0.1s;margin-bottom:var(--space-8);display:flex;justify-content:space-between;align-items:center;padding:var(--space-6);border:1px solid var(--primary-light)">
            <div style="display:flex;align-items:center;gap:var(--space-4)">
              <div style="width:56px;height:56px;border-radius:50%;background:rgba(79,70,229,0.1);color:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:28px">
                <span class="material-icons-round">account_balance_wallet</span>
              </div>
              <div>
                <span style="font-size:var(--font-size-sm);color:var(--text-secondary)">Số dư khả dụng</span>
                <strong style="display:block;font-size:var(--font-size-2xl);color:var(--text-primary);font-weight:800">
                  {{ (auth.currentUser()?.balance || 0).toLocaleString('vi-VN') }}đ
                </strong>
                @if (auth.currentUser()?.activePackage) {
                  <span style="font-size:var(--font-size-xs);color:var(--success);font-weight:600;display:flex;align-items:center;gap:4px;margin-top:4px">
                    <span class="material-icons-round" style="font-size:14px">stars</span> Đang sử dụng: {{ auth.currentUser()?.activePackage }} (đến {{ auth.currentUser()?.packageExpiry }})
                  </span>
                }
              </div>
            </div>
            <button class="btn btn-primary" (click)="openDepositModal()">
              <span class="material-icons-round">add_circle</span> Nạp thêm
            </button>
          </div>

          <div class="packages-grid animate-fade-in-up" style="animation-delay:0.15s">
            @for (pkg of packages; track pkg.id) {
              <div class="price-card glass-card" [class.popular]="pkg.id === 2">
                @if (pkg.id === 2) {
                  <div class="popular-badge">Phổ biến nhất</div>
                }
                <h3>{{ pkg.name }}</h3>
                <div class="price">
                  <span class="amount">{{ pkg.price.toLocaleString('vi-VN') }}đ</span>
                  <span class="duration">/ {{ pkg.duration }}</span>
                </div>
                <p>{{ pkg.description }}</p>
                <ul class="features">
                  <li><span class="material-icons-round" style="color:var(--success)">check</span> Đăng không giới hạn tin</li>
                  @if (pkg.id >= 2) {
                    <li><span class="material-icons-round" style="color:var(--success)">check</span> Ưu tiên hiển thị top</li>
                  }
                  @if (pkg.id >= 3) {
                    <li><span class="material-icons-round" style="color:var(--success)">check</span> Tick xanh uy tín</li>
                  }
                </ul>
                <button class="btn btn-lg full-width" [class.btn-primary]="pkg.id === 2" [class.btn-secondary]="pkg.id !== 2" (click)="buyPackage(pkg)">
                  Mua gói ngay
                </button>
              </div>
            }
          </div>

          <!-- Mock VNPay Modal -->
          @if (showPaymentModal()) {
            <div class="payment-modal-overlay animate-fade-in">
              <div class="payment-modal glass-card">
                <div class="modal-header">
                  <h3>Thanh toán qua VNPay (Mock)</h3>
                  <button class="close-btn" (click)="closeModal()"><span class="material-icons-round">close</span></button>
                </div>
                
                @if (isProcessing()) {
                  <div class="processing-view">
                    <div class="spinner"></div>
                    <p>Đang xử lý thanh toán...</p>
                  </div>
                } @else if (paymentSuccess()) {
                  <div class="success-view animate-fade-in">
                    <span class="material-icons-round" style="font-size:64px;color:var(--success)">check_circle</span>
                    <h3>Thanh toán thành công!</h3>
                    <p>{{ successMessage() }}</p>
                    <button class="btn btn-primary btn-lg" (click)="closeModalAndGoHome()">Xong</button>
                  </div>
                } @else {
                  <div class="payment-details">
                    <div class="bill-info">
                      <span>Loại giao dịch:</span>
                      <strong>{{ paymentType() === 'deposit' ? 'Nạp tiền vào tài khoản' : 'Mua gói đăng tuyển' }}</strong>
                    </div>
                    @if (paymentType() === 'package') {
                      <div class="bill-info">
                        <span>Sản phẩm:</span>
                        <strong>{{ selectedPackage()?.name }}</strong>
                      </div>
                    } @else {
                      <div class="form-group" style="margin-top:var(--space-4)">
                        <label class="form-label">Chọn mệnh giá nạp</label>
                        <div class="deposit-options">
                          <button class="amount-btn" [class.active]="depositAmount() === 50000" (click)="depositAmount.set(50000)">50k</button>
                          <button class="amount-btn" [class.active]="depositAmount() === 100000" (click)="depositAmount.set(100000)">100k</button>
                          <button class="amount-btn" [class.active]="depositAmount() === 200000" (click)="depositAmount.set(200000)">200k</button>
                          <button class="amount-btn" [class.active]="depositAmount() === 500000" (click)="depositAmount.set(500000)">500k</button>
                        </div>
                        <input type="number" class="form-input" style="margin-top:var(--space-2)" placeholder="Hoặc nhập số tiền khác" [(ngModel)]="customAmount" (input)="onCustomAmountChange()">
                      </div>
                    }

                    <div class="total-amount" style="margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px dashed var(--border-color);display:flex;justify-content:space-between;align-items:center">
                      <span style="font-size:var(--font-size-lg);font-weight:600;color:var(--text-secondary)">Tổng thanh toán:</span>
                      <span style="font-size:var(--font-size-2xl);font-weight:800;color:var(--primary-light)">
                        {{ getPayAmount().toLocaleString('vi-VN') }}đ
                      </span>
                    </div>

                    <button class="btn btn-primary btn-lg full-width" style="margin-top:var(--space-6)" (click)="processPayment()">
                      Xác nhận thanh toán
                    </button>
                    <button class="btn btn-secondary full-width" style="margin-top:var(--space-2)" (click)="closeModal()">
                      Hủy bỏ
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .pricing-page {
      padding: calc(80px + var(--space-8)) 0 var(--space-16);
      min-height: 80vh;
    }

    .packages-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-6);
      align-items: start;
    }

    .price-card {
      padding: var(--space-8);
      text-align: center;
      position: relative;
      transition: transform 0.3s ease;
    }

    .price-card:hover { transform: translateY(-8px); }

    .price-card h3 {
      font-size: var(--font-size-lg);
      font-weight: 700;
      color: var(--text-secondary);
      margin-bottom: var(--space-4);
    }

    .price {
      margin-bottom: var(--space-4);
    }

    .amount {
      font-size: var(--font-size-3xl);
      font-weight: 800;
      color: var(--text-primary);
    }

    .duration {
      font-size: var(--font-size-base);
      color: var(--text-muted);
    }

    .price-card p {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-6);
      min-height: 48px;
    }

    .features {
      list-style: none;
      padding: 0;
      margin: 0 0 var(--space-6) 0;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .features li {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .features .material-icons-round { font-size: 18px; margin-top: 2px; }

    .popular {
      border: 2px solid var(--primary-light);
      background: linear-gradient(180deg, rgba(79, 70, 229, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%);
    }

    .popular-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary-gradient);
      color: white;
      font-size: var(--font-size-xs);
      font-weight: 700;
      padding: 4px 16px;
      border-radius: var(--radius-full);
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
    }

    .full-width { width: 100%; }
    .gradient-text {
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Modal */
    .payment-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .payment-modal {
      width: 100%;
      max-width: 480px;
      padding: var(--space-8);
      background: var(--bg-dashboard);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);
    }

    .modal-header h3 { font-size: var(--font-size-xl); font-weight: 700; }

    .close-btn {
      background: none; border: none; color: var(--text-muted); cursor: pointer;
    }

    .close-btn:hover { color: var(--text-primary); }

    .bill-info {
      display: flex;
      justify-content: space-between;
      color: var(--text-secondary);
      font-size: var(--font-size-base);
      margin-bottom: var(--space-3);
    }

    .bill-info strong { color: var(--text-primary); font-weight: 600; }

    .deposit-options {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-2);
    }

    .amount-btn {
      padding: var(--space-2);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .amount-btn.active, .amount-btn:hover {
      background: rgba(79, 70, 229, 0.1);
      border-color: var(--primary-light);
      color: var(--primary-light);
    }

    .processing-view, .success-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-4);
      padding: var(--space-8) 0;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border-color);
      border-top-color: var(--primary-light);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { 100% { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .packages-grid { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
      .account-balance { flex-direction: column; gap: var(--space-4); text-align: center; }
    }
  `]
})
export class PricingComponent {
  auth = inject(AuthService);
  router = inject(Router);

  // Exclude "Đăng tin lẻ" (ID 4) from subscription grid
  packages = ADMIN_DATA.packages.filter(p => p.id !== 4);

  showPaymentModal = signal(false);
  paymentType = signal<'deposit' | 'package'>('deposit');
  selectedPackage = signal<any | null>(null);
  depositAmount = signal<number>(100000);
  customAmount: number | null = null;
  
  isProcessing = signal(false);
  paymentSuccess = signal(false);
  successMessage = signal('');

  openDepositModal() {
    this.paymentType.set('deposit');
    this.depositAmount.set(100000);
    this.customAmount = null;
    this.isProcessing.set(false);
    this.paymentSuccess.set(false);
    this.showPaymentModal.set(true);
  }

  buyPackage(pkg: any) {
    this.paymentType.set('package');
    this.selectedPackage.set(pkg);
    this.isProcessing.set(false);
    this.paymentSuccess.set(false);
    this.showPaymentModal.set(true);
  }

  closeModal() {
    this.showPaymentModal.set(false);
  }

  closeModalAndGoHome() {
    this.closeModal();
    this.router.navigate(['/employer/dashboard']);
  }

  onCustomAmountChange() {
    if (this.customAmount && this.customAmount > 0) {
      this.depositAmount.set(this.customAmount);
    }
  }

  getPayAmount(): number {
    return this.paymentType() === 'deposit' ? this.depositAmount() : (this.selectedPackage()?.price || 0);
  }

  processPayment() {
    this.isProcessing.set(true);
    
    // Simulate API delay
    setTimeout(() => {
      this.isProcessing.set(false);
      this.paymentSuccess.set(true);

      if (this.paymentType() === 'deposit') {
         const result = this.auth.addBalance(this.getPayAmount());
         this.successMessage.set(result.message);
      } else {
         const pkg = this.selectedPackage();
         // Calculate duration in months from string like "3 tháng"
         const months = parseInt(pkg.duration);
         const result = this.auth.updatePackage(pkg.name, isNaN(months) ? 1 : months);
         this.successMessage.set(result.message);
      }
    }, 2000);
  }
}
