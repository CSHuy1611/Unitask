import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { Subject } from 'rxjs';

const hubUrl = window.location.port === '4200'
  ? 'http://localhost:5250/hub/dashboard'
  : '/hub/dashboard';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: HubConnection | undefined;

  public applicationCheckInOccurred$ = new Subject<number>();
  public applicationCheckOutOccurred$ = new Subject<number>();
  public applicationApprovedOccurred$ = new Subject<number>();
  public applicationStatusChanged$ = new Subject<number>();
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
      this.applicationCheckInOccurred$.next(jobId);
    });

    this.hubConnection.on('ApplicationCheckOutOccurred', (jobId: number) => {
      console.log('[SignalRService] ApplicationCheckOutOccurred received for JobId:', jobId);
      this.applicationCheckOutOccurred$.next(jobId);
    });

    this.hubConnection.on('ApplicationApprovedOccurred', (jobId: number) => {
      console.log('[SignalRService] ApplicationApprovedOccurred received for JobId:', jobId);
      this.applicationApprovedOccurred$.next(jobId);
    });

    this.hubConnection.on('ApplicationStatusChanged', (jobId: number) => {
      console.log('[SignalRService] ApplicationStatusChanged received for JobId:', jobId);
      this.applicationStatusChanged$.next(jobId);
    });

    this.hubConnection.on('JobCreated', () => {
      console.log('[SignalRService] JobCreated received');
      this.jobCreated$.next();
    });

    this.hubConnection.on('TransactionOccurred', () => {
      console.log('[SignalRService] TransactionOccurred received');
      this.transactionOccurred$.next();
    });
  }
}
