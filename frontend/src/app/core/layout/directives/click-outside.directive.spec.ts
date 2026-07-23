import { ElementRef } from '@angular/core';
import { ClickOutsideDirective } from './click-outside.directive';

describe('ClickOutsideDirective', () => {
  function makeDirective(contains: boolean) {
    const host = { contains: () => contains } as unknown as HTMLElement;
    const dir = new ClickOutsideDirective(new ElementRef(host));
    let emitted = 0;
    dir.clickOutside.subscribe(() => emitted++);
    return { dir, emitted: () => emitted };
  }

  it('émet quand le clic est en dehors de l’hôte', () => {
    const { dir, emitted } = makeDirective(false);
    dir.onDocumentInteraction({ target: document.createElement('div') } as any);
    expect(emitted()).toBe(1);
  });

  it('n’émet pas quand le clic est à l’intérieur de l’hôte', () => {
    const { dir, emitted } = makeDirective(true);
    dir.onDocumentInteraction({ target: document.createElement('span') } as any);
    expect(emitted()).toBe(0);
  });

  it('n’émet pas sans cible', () => {
    const { dir, emitted } = makeDirective(false);
    dir.onDocumentInteraction({ target: null } as any);
    expect(emitted()).toBe(0);
  });
});
