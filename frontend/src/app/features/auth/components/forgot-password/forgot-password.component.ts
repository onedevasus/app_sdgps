import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    if (this.forgotPasswordForm.valid) {
      const email = this.forgotPasswordForm.value.email;

      // Appel au service pour demander la réinitialisation
      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          console.log('Demande de réinitialisation envoyée', response);
          this.isLoading = false;
          this.successMessage = 'Un code de vérification a été envoyé à votre adresse email.';
          
          // Rediriger vers la page de vérification du code après 2 secondes
          setTimeout(() => {
            this.router.navigate(['/auth/verify-code'], { 
              queryParams: { email: email } 
            });
          }, 2000);
        },
        error: (err) => {
          console.error('Erreur lors de la demande', err);
          this.errorMessage = err.error?.message || err.error?.detail || 
            'Une erreur est survenue. Veuillez vérifier votre email.';
          this.isLoading = false;
        }
      });
    } else {
      this.forgotPasswordForm.markAllAsTouched();
      this.errorMessage = 'Veuillez entrer un email valide.';
      this.isLoading = false;
    }
  }

  shouldShowError(controlName: string): boolean {
    const control = this.forgotPasswordForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
