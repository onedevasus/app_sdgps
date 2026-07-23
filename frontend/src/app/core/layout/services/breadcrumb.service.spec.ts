import { TestBed } from '@angular/core/testing';

import { BreadcrumbService } from './breadcrumb.service';
import { BreadcrumbItem } from '../interfaces/menu.interface';

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BreadcrumbService] });
    service = TestBed.inject(BreadcrumbService);
  });

  it('émet null par défaut (repli URL du topbar)', () => {
    let value: BreadcrumbItem[] | null | undefined;
    service.trail$.subscribe(v => (value = v));
    expect(value).toBeNull();
  });

  it('set() publie le fil d’Ariane métier', () => {
    const trail: BreadcrumbItem[] = [{ label: 'Projet', url: '/p' } as BreadcrumbItem];
    let value: BreadcrumbItem[] | null | undefined;
    service.trail$.subscribe(v => (value = v));

    service.set(trail);
    expect(value).toEqual(trail);
  });

  it('clear() remet le fil à null', () => {
    let value: BreadcrumbItem[] | null | undefined;
    service.trail$.subscribe(v => (value = v));

    service.set([{ label: 'X' } as BreadcrumbItem]);
    service.clear();
    expect(value).toBeNull();
  });
});
