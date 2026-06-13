"""
Test simple de la clé API SendGrid
"""
from decouple import config
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Récupérer la clé API
api_key = config('SENDGRID_API_KEY', default='')

print("="*60)
print("🔑 TEST DE LA CLÉ API SENDGRID")
print("="*60)
print()

if not api_key:
    print("❌ ERREUR : SENDGRID_API_KEY non configurée dans .env")
    print()
    print("Solution :")
    print("1. Ouvrez backend/.env")
    print("2. Ajoutez : SENDGRID_API_KEY=SG.votre_cle_ici")
    exit(1)

print(f"Clé API trouvée : {api_key[:10]}...{api_key[-10:]}")
print()

# Tester l'authentification
try:
    sg = SendGridAPIClient(api_key)
    response = sg.client.user.get()
    
    if response.status_code == 200:
        print("✅ CLÉ API VALIDE !")
        print()
        user_data = response.body
        print(f"Username: {user_data.get('username', 'N/A')}")
        print(f"Email: {user_data.get('email', 'N/A')}")
        print()
        print("La clé API fonctionne correctement.")
    else:
        print(f"❌ ERREUR : Status code {response.status_code}")
        print(f"Response: {response.body}")
        
except Exception as e:
    print(f"❌ ERREUR D'AUTHENTIFICATION")
    print()
    print(f"Détails : {str(e)}")
    print()
    print("Causes possibles :")
    print("1. Clé API incorrecte ou invalide")
    print("2. Clé API révoquée")
    print("3. Permissions insuffisantes")
    print("4. Compte SendGrid non vérifié")
    print()
    print("Solution :")
    print("1. Allez sur https://app.sendgrid.com/settings/api_keys")
    print("2. Créez une nouvelle clé API")
    print("3. Copiez la clé complète")
    print("4. Mettez à jour backend/.env")

print()
print("="*60)
