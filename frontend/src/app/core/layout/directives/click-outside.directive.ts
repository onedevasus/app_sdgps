import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

/**
 * Émet `clickOutside` lorsqu'un clic (ou un appui tactile) se produit EN DEHORS de l'élément
 * hôte. Utilisé notamment pour fermer le menu profil de la topbar quand l'utilisateur clique
 * ailleurs sur la page.
 *
 * Usage : `<div (clickOutside)="closeMenu()"> … </div>`
 */
@Directive({
  selector: '[clickOutside]'
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  @HostListener('document:click', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onDocumentInteraction(event: Event): void {
    const target = event.target as Node | null;
    // Un clic à l'intérieur de l'hôte (ex. l'avatar qui ouvre le menu, ou un item du menu)
    // ne déclenche PAS la fermeture.
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.clickOutside.emit();
    }
  }
}
