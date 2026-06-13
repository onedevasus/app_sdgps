import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';


/**
 * @description Point d'entrée principal de l'application Angular.
 *              Bootstrap le module AppModule pour démarrer l'application.
 */
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
