import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';
import { ToastComponent } from './components/toast/toast.component';
import { SignalRService } from './services/signalr.service';
import { JobService } from './services/job.service';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastComponent],
  template: `
    <app-header />
    <main>
      <router-outlet />
    </main>
    <app-footer />
    <app-toast />
  `,
  styles: [`
    main {
      min-height: 100vh;
    }
  `]
})
export class App implements OnInit, OnDestroy {
  private signalRService = inject(SignalRService);
  private jobService = inject(JobService);
  private authService = inject(AuthService);
  private subscriptions = new Subscription();

  ngOnInit() {
    this.signalRService.startConnection();

    this.subscriptions.add(
      this.signalRService.jobCreated$.subscribe(() => {
        // Tự động load lại danh sách việc làm khi có việc mới được đăng
        this.jobService.fetchJobs();
      })
    );

    this.subscriptions.add(
      this.signalRService.applicationStatusChanged$.subscribe(() => {
        this.jobService.fetchJobs();
      })
    );

    this.subscriptions.add(
      this.signalRService.applicationCheckInOccurred$.subscribe(() => {
        this.jobService.fetchJobs();
      })
    );

    this.subscriptions.add(
      this.signalRService.applicationCheckOutOccurred$.subscribe(() => {
        this.jobService.fetchJobs();
      })
    );

    this.subscriptions.add(
      this.signalRService.jobApplicationAdded$.subscribe(() => {
        this.jobService.fetchJobs();
      })
    );

    this.subscriptions.add(
      this.signalRService.transactionOccurred$.subscribe(() => {
        // Tự động load lại số dư ví nếu có biến động
        if (this.authService.isLoggedIn()) {
          this.authService.fetchBalance().subscribe();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
