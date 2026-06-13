import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AuthService} from '../../../../core/auth/auth.service';
import {Router, ActivatedRoute} from '@angular/router';

@Component({
    selector: 'app-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {
    // Déclaration du groupe de formulaire pour le changement de mot de passe
    changePasswordForm!: FormGroup;
    // Message d'erreur à afficher en cas de problème
    errorMessage: string = '';
    // Message de succès
    successMessage: string = '';
    // Indicateur de chargement pour l'expérience utilisateur
    isLoading: boolean = false;
    // Raison du changement (first_login ou user_request)
    reason: string = '';
    
    // Contrôle de visibilité des mots de passe
    showCurrentPassword: boolean = false;
    showNewPassword: boolean = false;
    showConfirmPassword: boolean = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute
    ) {
    }

    ngOnInit(): void {
        // Récupère la raison depuis les paramètres de requête
        this.reason = this.route.snapshot.queryParamMap.get('reason') || '';
        
        console.log('📄 ChangePasswordComponent initialisé - reason:', this.reason);

        // Initialisation du formulaire réactif avec validation
        this.changePasswordForm = this.fb.group({
            current_password: ['', [Validators.required]],
            new_password: ['', [
                Validators.required,
                Validators.minLength(8),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
            ]],
            confirm_password: ['', [Validators.required]]
        }, {
            validators: this.passwordMatchValidator
        });
    }

    /**
     * @description Validateur personnalisé pour vérifier que les mots de passe correspondent
     *              ET que le nouveau MDP est différent de l'ancien
     */
    passwordMatchValidator(form: FormGroup): void {
        const currentPassword = form.get('current_password')?.value;
        const newPassword = form.get('new_password')?.value;
        const confirmPassword = form.get('confirm_password')?.value;

        // Vérifier correspondance nouveau MDP et confirmation
        if (newPassword !== confirmPassword) {
            form.get('confirm_password')?.setErrors({mismatch: true});
        } else {
            // Supprime l'erreur mismatch si elle existe
            const errors = form.get('confirm_password')?.errors;
            if (errors) {
                delete errors['mismatch'];
                form.get('confirm_password')?.setErrors(Object.keys(errors).length > 0 ? errors : null);
            }
        }
        
        // Vérifier que le nouveau MDP est différent de l'ancien
        if (currentPassword && newPassword && currentPassword === newPassword) {
            form.get('new_password')?.setErrors({sameAsCurrent: true});
        } else {
            // Supprime l'erreur sameAsCurrent si elle existe
            const errors = form.get('new_password')?.errors;
            if (errors) {
                delete errors['sameAsCurrent'];
                form.get('new_password')?.setErrors(Object.keys(errors).length > 0 ? errors : null);
            }
        }
    }

    /**
     * @description Bascule la visibilité du mot de passe actuel
     */
    toggleCurrentPasswordVisibility(): void {
        this.showCurrentPassword = !this.showCurrentPassword;
    }

    /**
     * @description Bascule la visibilité du nouveau mot de passe
     */
    toggleNewPasswordVisibility(): void {
        this.showNewPassword = !this.showNewPassword;
    }

    /**
     * @description Bascule la visibilité de la confirmation du mot de passe
     */
    toggleConfirmPasswordVisibility(): void {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    /**
     * @description Méthode appelée lors de la soumission du formulaire
     */
    onSubmit(): void {
        // Réinitialise les messages
        this.errorMessage = '';
        this.successMessage = '';
        this.isLoading = true;

        // Vérifie si le formulaire est valide
        if (this.changePasswordForm.valid) {
            const formData = {
                current_password: this.changePasswordForm.get('current_password')?.value,
                new_password: this.changePasswordForm.get('new_password')?.value
            };

            console.log('📤 Soumission formulaire change-password', {
                hasCurrentPassword: !!formData.current_password,
                hasNewPassword: !!formData.new_password,
                newPasswordLength: formData.new_password?.length
            });

            // Appel au service pour changer le mot de passe
            this.authService.changePassword(formData).subscribe({
                next: (response) => {
                    console.log('✅ Mot de passe changé avec succès', response);
                    this.isLoading = false;
                    
                    // Message clair informant l'utilisateur du succès et de la redirection
                    this.successMessage = '✅ Opération réussie ! Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion dans quelques secondes...';

                    // Redirige vers la page de connexion après 3 secondes pour laisser temps de lire le message
                    setTimeout(() => {
                        this.router.navigate(['/auth/login']);
                    }, 3000);
                },
                error: (err) => {
                    console.error('❌ Erreur lors du changement de mot de passe', err);
                    this.isLoading = false;
                    
                    // Message d'erreur détaillé selon le type d'erreur
                    if (err.message === 'Utilisateur non authentifié') {
                        this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
                        // Rediriger vers login après 3 secondes
                        setTimeout(() => {
                            this.router.navigate(['/auth/login']);
                        }, 3000);
                    } else if (err.error?.detail) {
                        this.errorMessage = err.error.detail;
                    } else if (err.error?.message) {
                        this.errorMessage = err.error.message;
                    } else {
                        this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
                    }
                }
            });
        } else {
            // Si le formulaire n'est pas valide, marque tous les champs comme "touchés"
            this.changePasswordForm.markAllAsTouched();
            this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
            this.isLoading = false;
        }
    }

    /**
     * @description Méthode utilitaire pour vérifier si un champ doit afficher une erreur
     */
    shouldShowError(controlName: string): boolean {
        const control = this.changePasswordForm.get(controlName);
        return !!control && control.invalid && (control.dirty || control.touched);
    }

    /**
     * @description Retourne le message d'erreur spécifique pour un champ
     */
    getErrorMessage(controlName: string): string {
        const control = this.changePasswordForm.get(controlName);
        if (!control || !control.errors) return '';

        const errors = control.errors;

        if (controlName === 'current_password') {
            if (errors['required']) return 'Le mot de passe actuel est requis.';
        }

        if (controlName === 'new_password') {
            if (errors['required']) return 'Le nouveau mot de passe est requis.';
            if (errors['minlength']) return 'Le mot de passe doit contenir au moins 8 caractères.';
            if (errors['pattern']) {
                return 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial.';
            }
            if (errors['sameAsCurrent']) {
                return 'Le nouveau mot de passe doit être différent du mot de passe actuel.';
            }
        }

        if (controlName === 'confirm_password') {
            if (errors['required']) return 'La confirmation est requise.';
            if (errors['mismatch']) return 'Les mots de passe ne correspondent pas.';
        }

        return '';
    }

    /**
     * @description Retourne le titre approprié selon la raison
     */
    getTitle(): string {
        return this.reason === 'first_login'
            ? 'Première connexion - Changement obligatoire'
            : 'Changer votre mot de passe';
    }

    /**
     * @description Retourne le message d'instruction selon la raison
     */
    getInstructionMessage(): string {
        if (this.reason === 'first_login') {
            return 'Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant d\'accéder à l\'application.';
        }
        return 'Définissez votre nouveau mot de passe ci-dessous.';
    }

    /**
     * @description Vérifie si le mot de passe contient une majuscule
     */
    hasUpperCase(): boolean {
        const value = this.changePasswordForm?.get('new_password')?.value || '';
        return /[A-Z]/.test(value);
    }

    /**
     * @description Vérifie si le mot de passe contient une minuscule
     */
    hasLowerCase(): boolean {
        const value = this.changePasswordForm?.get('new_password')?.value || '';
        return /[a-z]/.test(value);
    }

    /**
     * @description Vérifie si le mot de passe contient un chiffre
     */
    hasDigit(): boolean {
        const value = this.changePasswordForm?.get('new_password')?.value || '';
        return /\d/.test(value);
    }

    /**
     * @description Vérifie si le mot de passe contient un caractère spécial
     */
    hasSpecialChar(): boolean {
        const value = this.changePasswordForm?.get('new_password')?.value || '';
        return /[@$!%*?&]/.test(value);
    }
}
