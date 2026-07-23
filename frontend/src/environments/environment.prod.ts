export const environment = {
  production: true,
  // Même origine : le SPA est servi par Django (WhiteNoise). Chemin relatif → l'API est
  // appelée sur le domaine qui sert l'app, sans CORS ni URL en dur.
  apiUrl: '/api'
};
