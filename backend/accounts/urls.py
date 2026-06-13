from django.urls import path
from .views import RegisterView, LoginView, ForgotPasswordView, VerifyCodeView, ResetPasswordView, ChangePasswordView, UserProfileView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-code/', VerifyCodeView.as_view(), name='verify-code'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),  # ← Nouveau endpoint
    path('me/', UserProfileView.as_view(), name='user-profile'),  # ← Profil utilisateur
]
