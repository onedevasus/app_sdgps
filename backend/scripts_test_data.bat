# Scripts de gestion des données de test

# Générer des données de test (20 organisations)
python manage.py generate_test_data --count 20

# Regénérer les données de test (supprime les anciennes d'abord)
python manage.py generate_test_data --count 50 --clear

# Voir le nombre de données de test
python manage.py shell -c "from accounts.models import Organization; print(f'Données de test: {Organization.objects.test_data_only().count()}'); print(f'Données réelles: {Organization.objects.real_data_only().count()}')"
