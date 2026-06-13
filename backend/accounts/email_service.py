"""
Service d'envoi d'email avec SendGrid
"""
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from decouple import config


class EmailService:
    """
    Service pour envoyer des emails via SendGrid
    """
    
    def __init__(self):
        # Récupérer la clé API SendGrid depuis les variables d'environnement
        self.api_key = config('SENDGRID_API_KEY', default='')
        self.from_email = config('FROM_EMAIL', default='noreply@sdgps.com')
        self.from_name = config('FROM_NAME', default='SDGPS - Système de Génération de Documents')
        
        if not self.api_key:
            print("⚠️  SENDGRID_API_KEY non configuré. Emails désactivés.")
    
    def send_email(self, to_email, subject, html_content, text_content=None):
        """
        Envoie un email
        
        Args:
            to_email: Email du destinataire
            subject: Sujet de l'email
            html_content: Contenu HTML de l'email
            text_content: Contenu texte alternatif (optionnel)
        
        Returns:
            bool: True si envoyé avec succès, False sinon
        """
        if not self.api_key:
            print(f"⚠️  Email non envoyé (API key manquante): {to_email}")
            return False
        
        try:
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content('text/html', html_content)
            )
            
            # Ajouter la version texte si fournie
            if text_content:
                message.add_content(Content('text/plain', text_content))
            
            # Envoyer l'email
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            
            # Vérifier le statut
            if response.status_code in [200, 201, 202]:
                print(f"✅ Email envoyé avec succès à: {to_email}")
                return True
            else:
                print(f"❌ Erreur envoi email: Status {response.status_code}")
                print(f"Response: {response.body}")
                return False
                
        except Exception as e:
            print(f"❌ Exception lors de l'envoi d'email: {str(e)}")
            return False
    
    def send_password_reset_code(self, to_email, code, username=None):
        """
        Envoie le code de réinitialisation du mot de passe
        
        Args:
            to_email: Email du destinataire
            code: Code à 6 chiffres
            username: Nom de l'utilisateur (optionnel)
        
        Returns:
            bool: True si envoyé avec succès
        """
        # Générer le contenu HTML
        html_content = self._generate_reset_password_html(code, username)
        
        # Générer le contenu texte
        text_content = self._generate_reset_password_text(code, username)
        
        # Sujet de l'email
        subject = "🔐 Votre code de réinitialisation de mot de passe - SDGPS"
        
        # Envoyer l'email
        return self.send_email(to_email, subject, html_content, text_content)
    
    def _generate_reset_password_html(self, code, username=None):
        """
        Génère le template HTML professionnel pour l'email de réinitialisation
        """
        user_greeting = f"Bonjour {username}" if username else "Bonjour"
        
        return f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Réinitialisation de mot de passe</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .email-container {{
                    background-color: #ffffff;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 40px 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .header p {{
                    margin: 10px 0 0 0;
                    font-size: 16px;
                    opacity: 0.9;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .greeting {{
                    font-size: 18px;
                    margin-bottom: 20px;
                    color: #333;
                }}
                .message {{
                    font-size: 16px;
                    color: #555;
                    margin-bottom: 30px;
                    line-height: 1.8;
                }}
                .code-container {{
                    background-color: #f8f9fa;
                    border: 2px dashed #667eea;
                    border-radius: 8px;
                    padding: 30px;
                    text-align: center;
                    margin: 30px 0;
                }}
                .code {{
                    font-size: 42px;
                    font-weight: 700;
                    color: #667eea;
                    letter-spacing: 8px;
                    margin: 0;
                }}
                .code-label {{
                    font-size: 14px;
                    color: #666;
                    margin-top: 10px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin: 30px 0;
                    border-radius: 4px;
                }}
                .warning p {{
                    margin: 0;
                    font-size: 14px;
                    color: #856404;
                }}
                .footer {{
                    background-color: #f8f9fa;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e9ecef;
                }}
                .footer p {{
                    margin: 5px 0;
                    font-size: 14px;
                    color: #6c757d;
                }}
                .footer .company {{
                    font-weight: 600;
                    color: #667eea;
                    margin-bottom: 10px;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-weight: 600;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <!-- Header -->
                <div class="header">
                    <h1>🔐 Réinitialisation de mot de passe</h1>
                    <p>SDGPS - Système de Génération de Documents</p>
                </div>
                
                <!-- Content -->
                <div class="content">
                    <p class="greeting">{user_greeting},</p>
                    
                    <p class="message">
                        Nous avons reçu une demande de réinitialisation de votre mot de passe. 
                        Utilisez le code ci-dessous pour procéder à la réinitialisation :
                    </p>
                    
                    <!-- Code -->
                    <div class="code-container">
                        <p class="code">{code}</p>
                        <p class="code-label">Code de vérification</p>
                    </div>
                    
                    <p class="message">
                        <strong>Instructions :</strong><br>
                        1. Copiez ce code<br>
                        2. Retournez sur l'application SDGPS<br>
                        3. Collez le code dans le champ prévu<br>
                        4. Définissez votre nouveau mot de passe
                    </p>
                    
                    <!-- Warning -->
                    <div class="warning">
                        <p>
                            ⚠️ <strong>Important :</strong> Ce code expire dans <strong>10 minutes</strong>. 
                            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                        </p>
                    </div>
                    
                    <p class="message">
                        Pour des raisons de sécurité, ne partagez jamais ce code avec qui que ce soit.
                    </p>
                </div>
                
                <!-- Footer -->
                <div class="footer">
                    <p class="company">SDGPS</p>
                    <p>Système de Génération de Documents PDF</p>
                    <p style="margin-top: 15px; font-size: 12px;">
                        Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
                    </p>
                    <p style="font-size: 12px;">
                        © 2026 SDGPS. Tous droits réservés.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _generate_reset_password_text(self, code, username=None):
        """
        Génère la version texte de l'email
        """
        user_greeting = f"Bonjour {username}" if username else "Bonjour"
        
        return f"""
{user_greeting},

Nous avons reçu une demande de réinitialisation de votre mot de passe.

Votre code de vérification est : {code}

Ce code expire dans 10 minutes.

Instructions :
1. Copiez ce code
2. Retournez sur l'application SDGPS
3. Collez le code dans le champ prévu
4. Définissez votre nouveau mot de passe

IMPORTANT : Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

Pour des raisons de sécurité, ne partagez jamais ce code avec qui que ce soit.

---
SDGPS - Système de Génération de Documents PDF
© 2026 SDGPS. Tous droits réservés.
        """
