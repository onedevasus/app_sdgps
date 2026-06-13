"""
Test rapide de l'envoi d'email avec SendGrid
"""
import os
import sys
import django

# Configurer Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sdgps.settings')
django.setup()

from accounts.email_service import EmailService

def test_email():
    print("="*60)
    print("📧 TEST D'ENVOI D'EMAIL SENDGRID")
    print("="*60)
    print()
    
    # Demander l'email du destinataire
    to_email = input("Entrez l'email du destinataire: ").strip()
    
    if not to_email:
        print("❌ Email vide. Test annulé.")
        return
    
    print()
    print(f"Envoi d'un email test à: {to_email}")
    print()
    
    # Créer le service d'email
    email_service = EmailService()
    
    # Tester l'envoi
    result = email_service.send_email(
        to_email=to_email,
        subject="🧪 Test SendGrid - SDGPS",
        html_content="""
        <h1 style="color: #667eea;">Test réussi !</h1>
        <p>Cet email a été envoyé avec succès via SendGrid.</p>
        <p><strong>SDGPS</strong> - Système de Génération de Documents PDF</p>
        """,
        text_content="Test réussi ! Cet email a été envoyé avec succès via SendGrid."
    )
    
    print()
    if result:
        print("✅ EMAIL ENVOYÉ AVEC SUCCÈS !")
        print()
        print("Vérifiez votre boîte de réception (et les spams).")
    else:
        print("❌ ÉCHEC DE L'ENVOI")
        print()
        print("Vérifiez que:")
        print("  1. La clé API SendGrid est correcte dans .env")
        print("  2. Votre compte SendGrid est actif")
        print("  3. L'email expéditeur est configuré")
    
    print()
    print("="*60)

if __name__ == "__main__":
    test_email()
