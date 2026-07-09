import { Injectable, NgZone, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { Subject } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

const hubUrl = API_BASE_URL.endsWith('/api')
  ? API_BASE_URL.substring(0, API_BASE_URL.length - 4) + '/hub/dashboard'
  : '/hub/dashboard';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: HubConnection | undefined;
  private ngZone = inject(NgZone);

  public applicationCheckInOccurred$ = new Subject<number>();
  public applicationCheckOutOccurred$ = new Subject<number>();
  public applicationApprovedOccurred$ = new Subject<number>();
  public applicationStatusChanged$ = new Subject<number>();
  public jobApplicationAdded$ = new Subject<number>();
  public jobCreated$ = new Subject<void>();
  public transactionOccurred$ = new Subject<void>();

  constructor() {}

  public startConnection(): void {
    if (this.hubConnection) {
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('[SignalRService] Connection started');
        this.addListeners();
      })
      .catch(err => console.log('[SignalRService] Error while starting connection: ' + err));
  }

  private addListeners(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('ApplicationCheckInOccurred', (jobId: number) => {
      console.log('[SignalRService] ApplicationCheckInOccurred received for JobId:', jobId);
      this.ngZone.run(() => this.applicationCheckInOccurred$.next(jobId));
    });

    this.hubConnection.on('ApplicationCheckOutOccurred', (jobId: number) => {
      console.log('[SignalRService] ApplicationCheckOutOccurred received for JobId:', jobId);
      this.ngZone.run(() => this.applicationCheckOutOccurred$.next(jobId));
    });

    this.hubConnection.on('ApplicationApprovedOccurred', (jobId: number) => {
      console.log('[SignalRService] ApplicationApprovedOccurred received for JobId:', jobId);
      this.ngZone.run(() => this.applicationApprovedOccurred$.next(jobId));
    });

    this.hubConnection.on('JobApplicationAdded', (jobId: number) => {
      console.log('[SignalRService] JobApplicationAdded received for JobId:', jobId);
      this.ngZone.run(() => this.jobApplicationAdded$.next(jobId));
    });

    this.hubConnection.on('ApplicationStatusChanged', (jobId: number) => {
      console.log('[SignalRService] ApplicationStatusChanged received for JobId:', jobId);
      this.ngZone.run(() => this.applicationStatusChanged$.next(jobId));
    });

    this.hubConnection.on('JobCreated', () => {
      console.log('[SignalRService] JobCreated received');
      this.ngZone.run(() => this.jobCreated$.next());
    });

    this.hubConnection.on('TransactionOccurred', () => {
      console.log('[SignalRService] TransactionOccurred received');
      this.ngZone.run(() => this.transactionOccurred$.next());
    });
  }
}
