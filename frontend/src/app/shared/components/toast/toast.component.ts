import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toasts" 
        class="toast" 
        [class]="toast.type">
        <div class="toast-icon">
          <i class="fas" [class]="getIconClass(toast.type)"></i>
        </div>
        <div class="toast-content">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-close" (click)="removeToast(toast)">
          <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress" [style.animation-duration.ms]="toast.duration"></div>
      </div>
    </div>
  `,
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription!: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toast$.subscribe((toast: ToastMessage) => {
      this.toasts.push(toast);
      
      // Auto-removal après la durée spécifiée
      setTimeout(() => {
        this.removeToast(toast);
      }, toast.duration);
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  removeToast(toast: ToastMessage): void {
    const index = this.toasts.indexOf(toast);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success':
        return 'fa-check-circle';
      case 'error':
        return 'fa-exclamation-circle';
      case 'warning':
        return 'fa-exclamation-triangle';
      case 'info':
        return 'fa-info-circle';
      default:
        return 'fa-bell';
    }
  }
}
