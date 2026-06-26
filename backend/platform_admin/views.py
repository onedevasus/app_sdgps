"""
Vues pour la gestion du profil Super Admin
"""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .serializers import SuperAdminProfileSerializer, ChangePasswordSerializer
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class SuperAdminProfileView(generics.RetrieveUpdateAPIView):
    """
    Endpoint: GET/PUT /api/v1/platform-admin/me/profile
    
    Permissions: IsAuthenticated (Super Admin uniquement)
    
    GET: Récupère le profil de l'utilisateur connecté
    PUT/PATCH: Met à jour le profil (nom, prénom, téléphone, photo)
    """
    serializer_class = SuperAdminProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """
        Retourne uniquement l'utilisateur connecté
        Sécurité: Impossible d'accéder au profil d'un autre utilisateur
        """
        user = self.request.user
        
        # Vérification supplémentaire: Super Admin uniquement
        # Utilise is_superuser ou get_primary_role()
        if not (user.is_superuser or user.get_primary_role() == 'ROLE_APP_ADMIN'):
            logger.warning(f"Tentative d'accès non autorisé au profil par: {user.email}")
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Accès réservé aux Super Admins.")
        
        return user
    
    def retrieve(self, request, *args, **kwargs):
        """
        GET /api/v1/platform-admin/me/profile
        Récupération du profil avec logs
        """
        logger.info(f"📖 Profil consulté par: {request.user.email}")
        return super().retrieve(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        PUT /api/v1/platform-admin/me/profile
        Mise à jour complète du profil
        """
        logger.info(f"✏️ Mise à jour profil par: {request.user.email}")
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Profil mis à jour avec succès.',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    def perform_update(self, serializer):
        """Post-processing après mise à jour"""
        serializer.save()
        logger.info(f"✅ Profil mis à jour: {serializer.instance.email}")


class ChangePasswordView(APIView):
    """
    Endpoint: POST /api/v1/platform-admin/me/change-password
    
    Permissions: IsAuthenticated (Super Admin uniquement)
    
    Sécurité:
    - Requiert le mot de passe actuel
    - Validation mot de passe fort
    - Déconnexion de toutes les sessions après changement
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        POST /api/v1/platform-admin/me/change-password
        
        Body:
        {
            "current_password": "mot_de_passe_actuel",
            "new_password": "nouveau_mot_de_passe",
            "confirm_password": "confirmation"
        }
        """
        user = request.user
        
        # Vérification Super Admin
        if not (user.is_superuser or user.get_primary_role() == 'ROLE_APP_ADMIN'):
            logger.warning(f"Tentative changement MDP non autorisé par: {user.email}")
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Accès réservé aux Super Admins.")
        
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            try:
                # Changement du mot de passe
                user.set_password(serializer.validated_data['new_password'])
                
                # Marquer les champs de sécurité
                from django.utils import timezone
                user.must_change_password = False
                user.password_changed_at = timezone.now()
                
                # Sauvegarder TOUT en une seule fois
                user.save(update_fields=['password', 'must_change_password', 'password_changed_at'])
                
                logger.info(f"🔐 Mot de passe changé par: {user.email}")
                
                return Response({
                    'message': 'Mot de passe changé avec succès. Veuillez vous reconnecter.',
                    'require_relogin': True
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"❌ Erreur changement MDP: {str(e)}")
                import traceback
                traceback.print_exc()
                return Response(
                    {"detail": f"Une erreur est survenue: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
