from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, LoginSerializer
import random
import string
from django.core.cache import cache
from .email_service import EmailService
from django.db import IntegrityError
from rest_framework.permissions import IsAuthenticated

User = get_user_model()


class RegisterView(APIView):
    """
    Vue pour l'inscription des utilisateurs.
    POST /api/auth/register/
    """
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                user = serializer.save()
                
                # Générer un token JWT
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                
                return Response({
                    'token': access_token,
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'nom_societe': user.nom_societe
                    }
                }, status=status.HTTP_201_CREATED)
            
            except IntegrityError as e:
                # Gérer les erreurs de contrainte unique (email déjà utilisé)
                error_message = str(e)
                
                if 'username' in error_message or 'email' in error_message:
                    return Response({
                        'detail': 'Cet email est déjà utilisé. Veuillez utiliser un autre email ou vous connecter.',
                        'code': 'EMAIL_ALREADY_EXISTS',
                        'field': 'email'
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({
                        'detail': 'Une erreur de base de données est survenue. Veuillez réessayer.',
                        'code': 'DATABASE_ERROR'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            except Exception as e:
                # Gérer les autres erreurs inattendues
                print(f"Erreur lors de l'inscription: {str(e)}")
                return Response({
                    'detail': 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.',
                    'code': 'UNEXPECTED_ERROR'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Erreurs de validation du sérialiseur
        errors = serializer.errors
        
        # Formater les erreurs pour le frontend
        formatted_errors = {}
        
        if 'email' in errors:
            formatted_errors['email'] = 'Cet email est déjà utilisé ou invalide.'
        elif 'password' in errors:
            formatted_errors['password'] = 'Le mot de passe ne respecte pas les critères de sécurité.'
        elif 'non_field_errors' in errors:
            formatted_errors['general'] = errors['non_field_errors'][0]
        else:
            # Prendre la première erreur disponible
            first_field = list(errors.keys())[0]
            formatted_errors['general'] = f"Erreur dans le champ {first_field}: {errors[first_field][0]}"
        
        return Response(formatted_errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    Vue pour la connexion des utilisateurs.
    POST /api/auth/login/
    """
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            # Vérifier si l'email existe dans la BDD
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                user = User.objects.get(email=email)
                # Email trouvé, vérifier le mot de passe
                authenticated_user = authenticate(username=email, password=password)
                
                if authenticated_user is not None:
                    # Mot de passe correct - Générer un token JWT
                    refresh = RefreshToken.for_user(authenticated_user)
                    access_token = str(refresh.access_token)
                    
                    # Mettre à jour la date de dernière connexion
                    if hasattr(authenticated_user, 'update_last_connection'):
                        authenticated_user.update_last_connection()
                    
                    return Response({
                        'token': access_token,
                        'user': {
                            'id': authenticated_user.id,
                            'email': authenticated_user.email,
                            'first_name': authenticated_user.first_name,
                            'last_name': authenticated_user.last_name,
                            'nom_societe': authenticated_user.nom_societe
                        }
                    }, status=status.HTTP_200_OK)
                else:
                    # Email correct mais mot de passe incorrect
                    return Response(
                        {
                            'detail': 'Mot de passe incorrect.',
                            'message': 'Le mot de passe saisi ne correspond pas à cet email. Veuillez réessayer ou cliquez sur "Mot de passe oublié".',
                            'code': 'INVALID_PASSWORD'
                        },
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                    
            except User.DoesNotExist:
                # Email n'existe pas dans la BDD
                return Response(
                    {
                        'detail': 'Email non trouvé.',
                        'message': 'Aucun compte n\'est associé à cette adresse email. Veuillez vérifier l\'email saisi ou créer un compte.',
                        'code': 'EMAIL_NOT_FOUND',
                        'suggestion': 'Créer un compte'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    """
    Vue pour demander la réinitialisation du mot de passe.
    POST /api/auth/forgot-password/
    """
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'detail': 'Email requis.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Pour la sécurité, ne pas révéler si l'email existe
            return Response({
                'detail': 'Si cet email existe, un code a été envoyé.'
            }, status=status.HTTP_200_OK)
        
        # Générer un code à 6 chiffres
        code = ''.join(random.choices(string.digits, k=6))
        
        # Stocker le code dans le cache (expire dans 10 minutes)
        cache.set(f'reset_code_{email}', code, timeout=600)
        
        # Envoyer l'email avec le code
        email_service = EmailService()
        email_sent = email_service.send_password_reset_code(
            to_email=email,
            code=code,
            username=f"{user.first_name} {user.last_name}" if user.first_name or user.last_name else None
        )
        
        if email_sent:
            return Response({
                'detail': 'Un code de vérification a été envoyé à votre email.',
                'message': 'Vérifiez votre boîte de réception (et vos spams)'
            }, status=status.HTTP_200_OK)
        else:
            # Fallback: afficher dans la console en cas d'échec d'envoi
            print(f"\n{'='*50}")
            print(f"⚠️  EMAIL NON ENVOYÉ - CODE DE RÉINITIALISATION pour {email}: {code}")
            print(f"{'='*50}\n")
            
            return Response({
                'detail': 'Un code de vérification a été généré.',
                'message': 'MODE TEST: Vérifiez la console backend pour le code',
                'code': code  # Seulement en développement!
            }, status=status.HTTP_200_OK)


class VerifyCodeView(APIView):
    """
    Vue pour vérifier le code de réinitialisation.
    POST /api/auth/verify-code/
    """
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        
        if not email or not code:
            return Response(
                {'detail': 'Email et code requis.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Récupérer le code du cache
        stored_code = cache.get(f'reset_code_{email}')
        
        if not stored_code or stored_code != code:
            return Response(
                {'detail': 'Code invalide ou expiré.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Générer un token temporaire pour la réinitialisation
        refresh = RefreshToken.for_user(User.objects.get(email=email))
        temp_token = str(refresh.access_token)
        
        # Stocker le token pour validation ultérieure
        cache.set(f'reset_token_{email}', temp_token, timeout=300)
        
        return Response({
            'detail': 'Code vérifié avec succès.',
            'token': temp_token
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    Vue pour réinitialiser le mot de passe.
    POST /api/auth/reset-password/
    """
    def post(self, request):
        email = request.data.get('email')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not all([email, token, new_password]):
            return Response(
                {'detail': 'Tous les champs sont requis.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier le token
        stored_token = cache.get(f'reset_token_{email}')
        
        if not stored_token or stored_token != token:
            return Response(
                {'detail': 'Token invalide ou expiré.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            user.set_password(new_password)
            user.save()
            
            # Supprimer le token utilisé
            cache.delete(f'reset_token_{email}')
            cache.delete(f'reset_code_{email}')
            
            return Response({
                'detail': 'Mot de passe réinitialisé avec succès.'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response(
                {'detail': 'Utilisateur non trouvé.'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class ChangePasswordView(APIView):
    """
    Vue pour changer le mot de passe (première connexion ou changement volontaire).
    POST /api/auth/change-password/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        # Validation des champs requis
        if not all([current_password, new_password]):
            return Response(
                {'detail': 'Mot de passe actuel et nouveau mot de passe requis.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier le mot de passe actuel
        if not user.check_password(current_password):
            return Response(
                {'detail': 'Mot de passe actuel incorrect.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Valider la force du nouveau mot de passe
        if len(new_password) < 8:
            return Response(
                {'detail': 'Le mot de passe doit contenir au moins 8 caractères.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Définir le nouveau mot de passe
        user.set_password(new_password)
        
        # IMPORTANT: Sauvegarder le nouveau mot de passe dans la BDD
        user.save(update_fields=['password'])
        
        # Marquer comme changé (désactive must_change_password)
        if hasattr(user, 'mark_password_changed'):
            user.mark_password_changed()
        else:
            user.must_change_password = False
            from django.utils import timezone
            user.password_changed_at = timezone.now()
            user.save(update_fields=['must_change_password', 'password_changed_at'])
        
        return Response({
            'detail': 'Mot de passe changé avec succès.',
            'message': 'Vous pouvez maintenant accéder à l\'application.'
        }, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    """
    Vue pour récupérer le profil de l'utilisateur authentifié.
    GET /api/auth/me/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        return Response({
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'must_change_password': getattr(user, 'must_change_password', False),
            'password_changed_at': getattr(user, 'password_changed_at', None)
        }, status=status.HTTP_200_OK)
