# Stockage des fichiers (uploads)

Les fichiers uploadés (documents source des pièces, images + aperçus, avatars, logos
d'organisation) sont gérés par **django-storages**. Le backend cible l'**API S3**, donc le
fournisseur est un simple choix de configuration : AWS S3, Cloudflare R2, Backblaze B2,
OVHcloud/Scaleway, ou **MinIO auto-hébergé** (souveraineté) — tous S3-compatibles et
interchangeables sans changement de code.

## Comportement par défaut

- **Aucune variable configurée** → stockage sur le **système de fichiers local**
  (`MEDIA_ROOT = backend/media/`). C'est le mode de développement.
- **`AWS_STORAGE_BUCKET_NAME` défini** → tous les uploads vont dans le **bucket S3**
  configuré. Bucket **privé** : les fichiers sont servis par **URL pré-signée** à durée
  limitée (données cadastrales sensibles ; l'accès non signé est refusé — HTTP 403).

## Variables d'environnement (`.env` backend)

| Variable | Rôle |
|---|---|
| `AWS_STORAGE_BUCKET_NAME` | Nom du bucket. **Vide = stockage local.** |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Identifiants d'accès. |
| `AWS_S3_ENDPOINT_URL` | Endpoint S3 — **requis pour tout non-AWS** (R2, MinIO, OVH…). Vide = AWS. |
| `AWS_S3_REGION_NAME` | Région (ex. `us-east-1`, `eu-west-3`). |
| `AWS_S3_CUSTOM_DOMAIN` | Domaine public / CDN (optionnel). |
| `AWS_QUERYSTRING_EXPIRE` | Durée de validité des URLs pré-signées (s, défaut 3600). |

Réglages de sécurité fixés en dur (settings) : `AWS_DEFAULT_ACL=None`,
`AWS_QUERYSTRING_AUTH=True`, `AWS_S3_FILE_OVERWRITE=False`, signature `s3v4`.

## Migration des fichiers existants

Après avoir configuré un bucket, copier les fichiers locaux et renseigner les tailles :

```bash
python manage.py migrate_media_to_storage            # copie + backfill des tailles
python manage.py migrate_media_to_storage --dry-run  # simulation
```

Idempotent ; ne supprime jamais les fichiers locaux (nettoyer `media/` manuellement après
validation).

## Banc d'essai / bascule souveraine — MinIO (S3-compatible, gratuit)

Vérifié en local ainsi (sert aussi de preuve de la migration future vers l'auto-hébergé) :

```bash
docker run -d --name sdgps-minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin123 \
  minio/minio server /data --console-address ":9001"
docker exec sdgps-minio mc alias set local http://127.0.0.1:9000 minioadmin minioadmin123
docker exec sdgps-minio mc mb -p local/sdgps-media
```

Puis dans `.env` (le backend l'atteint via `host.docker.internal`) :

```
AWS_STORAGE_BUCKET_NAME=sdgps-media
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123
AWS_S3_ENDPOINT_URL=http://host.docker.internal:9000
AWS_S3_REGION_NAME=us-east-1
```

`docker restart sdgps-backend` (l'autoreload ne suffit pas sur le bind-mount Windows→Docker).

## Performance des statistiques (`/admin/quotas/stockage`)

Sur un stockage objet, lire `field.size` = une requête réseau par fichier. Les tailles sont
donc **figées en base à l'upload** : `PieceImage.taille_octets` (déjà) et désormais
`Piece.taille_octets`. La ventilation utilise ces valeurs (repli disque pour les données
legacy, corrigé par `migrate_media_to_storage`).

## Production

`requirements.txt` inclut `django-storages` et `boto3` : **reconstruire l'image** backend
pour les intégrer (`docker build`). Le bind-mount `media/` n'est plus nécessaire quand un
bucket est configuré (les fichiers sont dans le bucket).
