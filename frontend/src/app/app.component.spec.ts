import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('expose le titre de l’application', () => {
    const cmp = new AppComponent();
    expect(cmp.title).toContain('SDGPS');
  });
});
