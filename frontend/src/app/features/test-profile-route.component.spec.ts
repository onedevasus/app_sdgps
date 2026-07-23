import { TestProfileRouteComponent } from './test-profile-route.component';

describe('TestProfileRouteComponent', () => {
  it('goToProfile navigue vers /admin/profile', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const cmp = new TestProfileRouteComponent(router as any);
    cmp.goToProfile();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/profile']);
  });
});
