import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Injectable({ providedIn: 'root' })
export class ProgramFormGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const loggedIn = await this.auth.isLoggedIn();
    return loggedIn ? true : this.router.parseUrl('/usuario/ingresar');
  }
}
