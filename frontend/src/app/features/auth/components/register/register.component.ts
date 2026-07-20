import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AuthService} from '../../../../core/auth/auth.service'; // Ajuste le chemin si nécessaire
import {Router} from '@angular/router'; // Pour la redirection après inscription
import {LayoutService} from '../../../../core/layout/services/layout.service'; // Bascule thème clair/sombre

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
    // Déclaration du groupe de formulaire pour l'inscription
    registerForm!: FormGroup;
    // Message d'erreur à afficher en cas de problème lors de l'inscription
    errorMessage: string = '';
    // Message de succès à afficher après inscription réussie
    successMessage: string = '';
    // Indicateur de chargement pour l'expérience utilisateur
    isLoading: boolean = false;

    // Contrôle de visibilité du mot de passe
    showPassword: boolean = false;
    showConfirmPassword: boolean = false;

    // Critères de validation du mot de passe avec état dynamique
    passwordCriteria = [
        {id: 'length', label: 'Au moins 8 caractères', valid: false},
        {id: 'uppercase', label: 'Au moins une majuscule (A-Z)', valid: false},
        {id: 'lowercase', label: 'Au moins une minuscule (a-z)', valid: false},
        {id: 'number', label: 'Au moins un chiffre (0-9)', valid: false},
        {id: 'special', label: 'Au moins un caractère spécial (@$!%*?&)', valid: false}
    ];

    constructor(
        private fb: FormBuilder, // Injecte FormBuilder pour créer des contrôles de formulaire
        private authService: AuthService, // Injecte AuthService pour la logique d'authentification
        private router: Router, // Injecte Router pour la navigation
        public layout: LayoutService // Bascule de thème (applique aussi le thème sauvegardé)
    ) {
    }

    ngOnInit(): void {
        // Initialisation du formulaire réactif avec les champs et leurs validateurs
        this.registerForm = this.fb.group({
            firstName: ['', Validators.required], // Prénom : champ requis
            lastName: ['', Validators.required],  // Nom : champ requis
            companyName: ['', Validators.required], // Nom de la société : champ requis
            email: ['', [Validators.required, Validators.email]], // Email : requis et format email valide
            password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]], // Mot de passe : requis, min 8 caractères, au moins une majuscule, une minuscule, un chiffre et un caractère spécial
          confirmPassword: ['', Validators.required], // Confirmation du mot de passe : champ requis
          organizationCode: [''] // Code d'organisation optionnel (RBAC)
        }, {
            // Ajout d'un validateur personnalisé au niveau du groupe pour vérifier la correspondance des mots de passe
            validator: this.passwordMatchValidator
        });

        // Écoute des changements sur le champ mot de passe pour validation en temps réel
        this.registerForm.get('password')?.valueChanges.subscribe(value => {
            this.validatePasswordCriteria(value || '');
        });
    }

    /**
     * @description Bascule la visibilité du mot de passe
     */
    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    /**
     * @description Bascule la visibilité de la confirmation du mot de passe
     */
    toggleConfirmPasswordVisibility(): void {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    /**
     * @description Valide les critères du mot de passe en temps réel
     * @param password Le mot de passe saisi par l'utilisateur
     */
    validatePasswordCriteria(password: string): void {
        // Vérifie chaque critère individuellement
        this.passwordCriteria[0].valid = password.length >= 8;
        this.passwordCriteria[1].valid = /[A-Z]/.test(password);
        this.passwordCriteria[2].valid = /[a-z]/.test(password);
        this.passwordCriteria[3].valid = /[0-9]/.test(password);
        this.passwordCriteria[4].valid = /[@$!%*?&]/.test(password);
    }

    /**
     * @description Vérifie si tous les critères du mot de passe sont valides
     * @returns Vrai si tous les critères sont satisfaits
     */
    areAllPasswordCriteriaValid(): boolean {
        return this.passwordCriteria.every(criterion => criterion.valid);
    }

    /**
     * @description Validateur personnalisé pour vérifier que les champs 'password' et 'confirmPassword' sont identiques.
     * @param formGroup Le groupe de formulaire à valider.
     * @returns Un objet d'erreur si les mots de passe ne correspondent pas, sinon null.
     */
    passwordMatchValidator(formGroup: FormGroup) {
        const password = formGroup.get('password')?.value;
        const confirmPassword = formGroup.get('confirmPassword')?.value;
        // Si les mots de passe existent et ne correspondent pas, retourne une erreur
        return password && confirmPassword && password !== confirmPassword ? {'mismatch': true} : null;
    }

    /**
     * @description Méthode appelée lors de la soumission du formulaire d'inscription.
     * Gère la validation du formulaire et l'appel au service d'authentification.
     */
    onSubmit(): void {
        // Réinitialise les messages et active l'indicateur de chargement
        this.errorMessage = '';
        this.successMessage = '';
        this.isLoading = true;

        // Vérifie si le formulaire est valide avant de procéder
        if (this.registerForm.valid) {
            // Mappe les champs du formulaire vers le format attendu par le backend
            const formData = this.registerForm.value;
            const userData = {
                first_name: formData.firstName,    // Prénom → first_name
                last_name: formData.lastName,      // Nom → last_name
                nomSociete: formData.companyName,
                email: formData.email,
                password: formData.password,
              confirmPassword: formData.confirmPassword,
              organizationCode: formData.organizationCode || undefined // Inclure seulement si renseigné
            };

            // Appel au service d'authentification pour l'inscription
            this.authService.register(userData).subscribe({
                next: (response) => {
                    // Gère la réussite de l'inscription
                    console.log('Inscription réussie', response);
                    // Désactive l'indicateur de chargement
                    this.isLoading = false;

                    // Affiche un message de succès clair
                    this.successMessage = `✅ Compte créé avec succès ! Bienvenue ${userData.first_name} ${userData.last_name}. Vous allez être redirigé vers la page de connexion...`;

                    // Redirige l'utilisateur vers la page de connexion après 3 secondes
                    setTimeout(() => {
                        this.router.navigate(['/auth/login']);
                    }, 3000);
                },
                error: (err) => {
                    // Gère les erreurs d'inscription (ex: email déjà utilisé, erreur serveur)
                    console.error('Erreur lors de l\'inscription', err);
                    console.error('Détails de l\'erreur:', err.error);

                    // AuthService préserve maintenant la structure backend dans err.error
                    this.errorMessage = this.getErrorMessage(err.error);

                    // Désactive l'indicateur de chargement
                    this.isLoading = false;
                }
            });
        } else {
            // Si le formulaire n'est pas valide, marque tous les champs comme "touchés" pour afficher les messages d'erreur
            this.registerForm.markAllAsTouched();
            // Affiche un message d'erreur général
            this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
            // Désactive l'indicateur de chargement
            this.isLoading = false;
        }
    }

    /**
     * @description Méthode utilitaire pour vérifier si un champ de formulaire est invalide et a été touché ou modifié.
     * @param controlName Le nom du contrôle de formulaire.
     * @returns Vrai si le champ doit afficher une erreur, faux sinon.
     */
    shouldShowError(controlName: string): boolean {
        const control = this.registerForm.get(controlName);
        return !!control && control.invalid && (control.dirty || control.touched);
    }

    /**
     * @description Interprète les erreurs backend et retourne un message convivial
     * @param error L'objet d'erreur reçu du backend
     * @returns Message d'erreur clair pour l'utilisateur
     */
    private getErrorMessage(error: any): string {
        // Si pas d'erreur, message par défaut
        if (!error) {
            return 'Une erreur inattendue est survenue. Veuillez réessayer.';
        }

        // Cas 1: Erreur avec code spécifique (backend structuré)
        if (error.code) {
            switch (error.code) {
                case 'EMAIL_ALREADY_EXISTS':
                    return '❌ Cet email est déjà utilisé. Veuillez utiliser un autre email ou vous connecter directement.';

                case 'DATABASE_ERROR':
                    return '⚠️ Une erreur technique est survenue. Veuillez réessayer dans quelques instants.';

                case 'UNEXPECTED_ERROR':
                    return '⚠️ Une erreur inattendue est survenue. Notre équipe a été notifiée. Veuillez réessayer plus tard.';

                default:
                    return error.detail || 'Une erreur est survenue. Veuillez réessayer.';
            }
        }

        // Cas 2: Erreur avec champ spécifique
        if (error.email) {
            return '❌ Cet email est déjà utilisé ou n\'est pas valide. Veuillez vérifier l\'adresse saisie.';
        }

        if (error.password) {
            return '❌ Le mot de passe ne respecte pas les critères de sécurité. Il doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.';
        }

        if (error.general) {
            return `❌ ${error.general}`;
        }

        // Cas 3: Erreur avec detail (format DRF standard)
        if (error.detail) {
            // Traduire les messages techniques en français clair
            const detailMessage = error.detail.toLowerCase();

            if (detailMessage.includes('unique') || detailMessage.includes('already exists')) {
                return '❌ Un compte avec cet email existe déjà. Veuillez vous connecter ou utiliser un autre email.';
            }

            if (detailMessage.includes('invalid')) {
                return '❌ Les données saisies sont invalides. Veuillez vérifier tous les champs.';
            }

            if (detailMessage.includes('required')) {
                return '❌ Tous les champs sont obligatoires. Veuillez remplir le formulaire complètement.';
            }

            return `❌ ${error.detail}`;
        }

        // Cas 4: Erreur HTTP sans détail
        if (error.status === 0) {
            return '⚠️ Impossible de contacter le serveur. Vérifiez votre connexion internet et réessayez.';
        }

        if (error.status === 500) {
            return '⚠️ Erreur serveur. Notre équipe technique a été notifiée. Veuillez réessayer dans quelques minutes.';
        }

        if (error.status === 400) {
            return '❌ Les données saisies sont incorrectes. Veuillez vérifier le formulaire.';
        }

        // Message par défaut
        return '❌ Une erreur est survenue lors de l\'inscription. Veuillez réessayer.';
    }
}
