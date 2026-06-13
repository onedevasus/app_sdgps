import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private toastr: ToastrService) {}

  /**
   * Afficher un toast de succès
   */
  success(title: string, message: string, duration?: number): void {
    this.toastr.success(message, title, {
      timeOut: duration || 3000
    });
  }

  /**
   * Afficher un toast d'erreur
   */
  error(title: string, message: string, duration?: number): void {
    this.toastr.error(message, title, {
      timeOut: duration || 4000
    });
  }

  /**
   * Afficher un toast d'avertissement
   */
  warning(title: string, message: string, duration?: number): void {
    this.toastr.warning(message, title, {
      timeOut: duration || 3000
    });
  }

  /**
   * Afficher un toast d'information
   */
  info(title: string, message: string, duration?: number): void {
    this.toastr.info(message, title, {
      timeOut: duration || 3000
    });
  }
}
