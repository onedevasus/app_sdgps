import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BreadcrumbItem } from '../interfaces/menu.interface';

/**
 * Fil d'Ariane MÉTIER partagé. Les pages qui connaissent leur contexte hiérarchique
 * (explorateur de projet, liste des SSDGPS, page des pièces…) publient leur trail via
 * `set()` ; le topbar l'affiche en priorité. Quand aucune page ne fournit de trail
 * (`null`), le topbar retombe sur un fil déduit de l'URL.
 *
 * La hiérarchie métier (Projet › Propriété › Affaire › SSDGPS › Session › Pièce) n'étant
 * pas reflétée dans l'URL, ce service est le seul moyen fiable de la restituer dans le topbar.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private trailSubject = new BehaviorSubject<BreadcrumbItem[] | null>(null);
  /** Trail métier courant, ou `null` si aucune page n'en fournit (→ repli URL du topbar). */
  public trail$: Observable<BreadcrumbItem[] | null> = this.trailSubject.asObservable();

  /** Définit le fil d'Ariane métier de la page courante. */
  set(trail: BreadcrumbItem[]): void {
    this.trailSubject.next(trail);
  }

  /** Efface le fil métier (à appeler en `ngOnDestroy`) → le topbar repasse au repli URL. */
  clear(): void {
    this.trailSubject.next(null);
  }
}
