import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { ProgramFormGuard } from './program-form.guard';

describe('ProgramFormGuard', () => {
  it('allows a user whose stored session is valid', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn']);
    const router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    auth.isLoggedIn.and.returnValue(Promise.resolve(true));
    const guard = new ProgramFormGuard(auth, router);

    expect(await guard.canActivate()).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('redirects a user without a valid session to login', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn']);
    const router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    auth.isLoggedIn.and.returnValue(Promise.resolve(false));
    const guard = new ProgramFormGuard(auth, router);

    await guard.canActivate();
    expect(router.parseUrl).toHaveBeenCalledWith('/usuario/ingresar');
  });
});
