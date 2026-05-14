import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LojaService } from '../services/services'; // ← services.ts, não loja.service.ts
import { MatSnackBar } from '@angular/material/snack-bar';

const ROTAS_PUBLICAS = ['/auth/login', '/api/lojas', '/api/v1/lojas'];

export const lojaInterceptor: HttpInterceptorFn = (req, next) => {
  const lojaService = inject(LojaService);
  const snackBar    = inject(MatSnackBar);

  const ehPublico = ROTAS_PUBLICAS.some(rota => req.url.includes(rota));
  const lojaId    = lojaService.getLojaIdHeader(); // ← método já existe no LojaService do services.ts

  if (!ehPublico && !lojaId) {
    snackBar.open('Selecione uma loja para continuar.', 'OK', {
      duration: 4000,
      panelClass: ['snack-warn'],
    });
    return throwError(() => new Error('Nenhuma loja selecionada.'));
  }

  const reqFinal = lojaId
    ? req.clone({ setHeaders: { 'X-Loja-Id': lojaId } })
    : req;

  return next(reqFinal).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 400 && err.error?.erro?.includes('X-Loja-Id')) {
        snackBar.open('Erro de loja: ' + err.error.erro, 'Fechar', {
          duration: 5000,
          panelClass: ['snack-error'],
        });
      }
      return throwError(() => err);
    })
  );
};