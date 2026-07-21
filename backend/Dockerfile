FROM python:3.11-slim

WORKDIR /app

# Bibliothèques natives requises par WeasyPrint (rendu HTML→PDF des rapports SSDGPS) :
# Pango/Cairo/HarfBuzz pour le texte, GDK-Pixbuf pour les images, libffi.
# Polices : URW Bookman (fonts-urw-base35) — équivalent libre, métriquement compatible
# de « Bookman Old Style » utilisée par le modèle de rapport métier.
RUN apt-get update && apt-get install --no-install-recommends -y \
        libpango-1.0-0 libpangocairo-1.0-0 libpangoft2-1.0-0 \
        libcairo2 libgdk-pixbuf-2.0-0 libffi8 libharfbuzz0b \
        shared-mime-info fonts-urw-base35 fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD python manage.py migrate --noinput && python manage.py runserver 0.0.0.0:8000