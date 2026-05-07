import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { CanActivateFn } from '@angular/router';

// ─── JWT Interceptor ────────────────────────────────────────
export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const token = localStorage.getItem('mf_token');
  const router = inject(Router);

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      if (err.status === 401) {
        localStorage.removeItem('mf_token');
        localStorage.removeItem('mf_user');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};

// ─── Auth Guard ─────────────────────────────────────────────
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('mf_token');
  if (!token) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

// ─── Token Helper ────────────────────────────────────────────
export const TokenHelper = {
  save(token: string, user: object) {
    localStorage.setItem('mf_token', token);
    localStorage.setItem('mf_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
  },
  getUser(): any {
    const u = localStorage.getItem('mf_user');
    return u ? JSON.parse(u) : null;
  },
  hasRole(...roles: string[]): boolean {
    const u = TokenHelper.getUser();
    return u && roles.includes(u.perfil);
  }

};

// ─── Role Guard ──────────────────────────────────────────────
export const roleGuard = (roles: string[]): CanActivateFn => () => {
  const router = inject(Router);
  const user = TokenHelper.getUser();
  if (!user || !roles.includes(user.perfil)) {
    router.navigate(['/caixa']);
    return false;
  }
  return true;
};
