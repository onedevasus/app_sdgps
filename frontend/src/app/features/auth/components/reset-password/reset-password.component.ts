import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  email: string = '';
  token: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.token = params['token'] || '';
      
      if (!this.email || !this.token) {
        this.router.navigate(['/auth/forgot-password']);
      }
    });

    this.resetForm = this.fb.group({
      newPassword: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('newPassword')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { 'mismatch': true } : null;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    if (this.resetForm.valid) {
      const newPassword = this.resetForm.value.newPassword;

      this.authService.resetPassword(this.email, this.token, newPassword).subscribe({
        next: (response) => {
          console.log('Mot de passe réinitialisé avec succès', response);
          this.isLoading = false;
          this.successMessage = 'Votre mot de passe a été réinitialisé avec succès !';
          
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (err) => {
          console.error('Erreur lors de la réinitialisation', err);
          this.errorMessage = err.error?.message || err.error?.detail || 
            'Une erreur est survenue. Veuillez réessayer.';
          this.isLoading = false;
        }
      });
    } else {
      this.resetForm.markAllAsTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
      this.isLoading = false;
    }
  }

  shouldShowError(controlName: string): boolean {
    const control = this.resetForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
