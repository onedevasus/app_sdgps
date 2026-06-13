import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.component.html',
  styleUrls: ['./verify-code.component.scss']
})
export class VerifyCodeComponent implements OnInit {
  verifyForm!: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  email: string = '';
  resendDisabled: boolean = false;
  countdown: number = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Récupérer l'email depuis les paramètres de requête
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      if (!this.email) {
        // Si pas d'email, rediriger vers forgot-password
        this.router.navigate(['/auth/forgot-password']);
      }
    });

    this.verifyForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    if (this.verifyForm.valid) {
      const code = this.verifyForm.value.code;

      this.authService.verifyResetCode(this.email, code).subscribe({
        next: (response) => {
          console.log('Code vérifié avec succès', response);
          this.isLoading = false;
          this.successMessage = 'Code vérifié avec succès !';
          
          // Rediriger vers la page de nouveau mot de passe
          setTimeout(() => {
            this.router.navigate(['/auth/reset-password'], { 
              queryParams: { 
                email: this.email,
                token: response.token 
              } 
            });
          }, 1000);
        },
        error: (err) => {
          console.error('Erreur de vérification', err);
          this.errorMessage = err.error?.message || err.error?.detail || 
            'Code invalide ou expiré. Veuillez réessayer.';
          this.isLoading = false;
        }
      });
    } else {
      this.verifyForm.markAllAsTouched();
      this.errorMessage = 'Veuillez entrer un code valide à 6 chiffres.';
      this.isLoading = false;
    }
  }

  resendCode(): void {
    if (this.resendDisabled) return;

    this.errorMessage = '';
    this.successMessage = '';
    
    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.successMessage = 'Nouveau code envoyé !';
        this.startCountdown();
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du renvoi du code.';
      }
    });
  }

  startCountdown(): void {
    this.resendDisabled = true;
    this.countdown = 60;
    
    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.resendDisabled = false;
        clearInterval(interval);
      }
    }, 1000);
  }
}
