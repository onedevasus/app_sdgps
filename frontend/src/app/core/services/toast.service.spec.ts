import { TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let toastr: jasmine.SpyObj<ToastrService>;

  beforeEach(() => {
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning', 'info']);
    TestBed.configureTestingModule({
      providers: [ToastService, { provide: ToastrService, useValue: toastr }],
    });
    service = TestBed.inject(ToastService);
  });

  it('success() délègue à toastr.success(message, title)', () => {
    service.success('Titre', 'Message');
    expect(toastr.success).toHaveBeenCalled();
    const [msg, title] = toastr.success.calls.mostRecent().args;
    expect(msg).toBe('Message');
    expect(title).toBe('Titre');
  });

  it('error/warning/info délèguent au bon canal', () => {
    service.error('T', 'M');
    service.warning('T', 'M');
    service.info('T', 'M');
    expect(toastr.error).toHaveBeenCalled();
    expect(toastr.warning).toHaveBeenCalled();
    expect(toastr.info).toHaveBeenCalled();
  });
});
