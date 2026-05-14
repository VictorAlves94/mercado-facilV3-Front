import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UsuarioService, LojaService } from '../../core/services/services';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, MatTooltipModule],
  template: `
<div class="page-wrapper">

  <div class="mf-page">

    <div class="page-header">
      <button mat-flat-button color="primary" (click)="abrirForm()">
        <mat-icon>person_add</mat-icon> Novo Usuário
      </button>
    </div>

    <div class="mf-card" style="padding:0;overflow:hidden">
      <table class="usuarios-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>Loja</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (u of usuarios(); track u.id) {
            <tr [class.inativo]="!u.ativo">
              <td>
                <div class="user-cell">
                  <div class="user-avatar-sm">{{ u.nome[0].toUpperCase() }}</div>
                  <span>{{ u.nome }}</span>
                </div>
              </td>
              <td>{{ u.email }}</td>
              <td>
                <span class="mf-badge"
                  [class]="u.perfil === 'ADMIN' ? 'danger'
                          : u.perfil === 'GERENTE' ? 'warning' : 'info'">
                  {{ u.perfil }}
                </span>
              </td>
              <td>{{ u.lojaNome || '—' }}</td>
              <td>
                <span class="mf-badge" [class]="u.ativo ? 'success' : 'neutral'">
                  {{ u.ativo ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="acoes-cell">
                @if (u.perfil !== 'ADMIN') {
                  <button mat-icon-button matTooltip="Editar" (click)="editarUsuario(u)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button
                          [matTooltip]="u.ativo ? 'Desativar' : 'Ativar'"
                          (click)="alterarStatus(u)">
                    <mat-icon>{{ u.ativo ? 'block' : 'check_circle' }}</mat-icon>
                  </button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

  </div>

  @if (modalAberto()) {
    <div class="form-overlay" (click)="fecharForm()">
      <div class="usuario-modal" (click)="$event.stopPropagation()">

        <div class="modal-header">
          <h2>{{ editando() ? 'Editar Usuário' : 'Novo Usuário' }}</h2>
          <button mat-icon-button (click)="fecharForm()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="salvar()" class="modal-body">

          <mat-form-field appearance="outline">
            <mat-label>Nome completo</mat-label>
            <input matInput formControlName="nome">
            <mat-error>Nome obrigatório (mín. 2 caracteres)</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email">
            <mat-error>E-mail inválido</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>
              {{ editando() ? 'Nova senha (em branco = manter atual)' : 'Senha' }}
            </mat-label>
            <input matInput type="password" formControlName="senha"
                   [placeholder]="editando() ? '••••••' : ''">
            @if (!editando()) {
              <mat-error>Senha obrigatória (mín. 6 caracteres)</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Perfil</mat-label>
            <mat-select formControlName="perfil">
              <mat-option value="GERENTE">Gerente</mat-option>
              <mat-option value="OPERADOR">Operador</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Loja</mat-label>
            <mat-select formControlName="lojaId">
              <mat-option [value]="null">— Sem loja —</mat-option>
              @for (l of lojas(); track l.id) {
                <mat-option [value]="l.id">{{ l.nome }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="modal-footer">
            <button mat-stroked-button type="button" (click)="fecharForm()">
              Cancelar
            </button>
            <button mat-flat-button color="primary" type="submit"
                    [disabled]="form.invalid || saving()">
              {{ saving() ? 'Salvando...' : editando() ? 'Salvar' : 'Criar Usuário' }}
            </button>
          </div>

        </form>
      </div>
    </div>
  }

</div>
  `,
  styles: [`
    .page-wrapper {
      position: relative;
    }

    .page-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1rem;
    }

    .usuarios-table {
      width: 100%;
      border-collapse: collapse;

      th {
        padding: .75rem 1rem;
        text-align: left;
        font-size: .75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: var(--mf-gray-500);
        border-bottom: 1px solid var(--mf-border);
        background: var(--mf-gray-50);
      }

      td {
        padding: .75rem 1rem;
        font-size: .875rem;
        border-bottom: 1px solid var(--mf-border);
      }

      tr:last-child td { border-bottom: none; }
      tr.inativo td    { opacity: .5; }
      tr:hover td      { background: var(--mf-gray-50); }
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: .5rem;
    }

    .user-avatar-sm {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: var(--mf-blue);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: .7rem; font-weight: 700; flex-shrink: 0;
    }

    .acoes-cell { display: flex; gap: .25rem; }

    .form-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .usuario-modal {
      background: white;
      border-radius: 12px;
      width: 480px;
      max-width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
    }

    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--mf-border);
      position: sticky; top: 0;
      background: white;
      z-index: 1;
      h2 { font-size: 1rem; font-weight: 600; margin: 0; }
    }

    .modal-body {
      padding: 1.25rem 1.5rem;
      display: flex; flex-direction: column; gap: .5rem;
      mat-form-field { width: 100%; }
    }

    .modal-footer {
      display: flex; justify-content: flex-end;
      gap: .5rem; margin-top: .5rem;
    }
  `]
})
export class UsuariosComponent implements OnInit {
  private svc     = inject(UsuarioService);
  private lojaSvc = inject(LojaService);
  private snack   = inject(MatSnackBar);
  private fb      = inject(FormBuilder);

  usuarios    = signal<any[]>([]);
  lojas       = signal<any[]>([]);
  modalAberto = signal(false);
  editando    = signal<any | null>(null);
  saving      = signal(false);

  form = this.fb.group({
    nome:   ['', [Validators.required, Validators.minLength(2)]],
    email:  ['', [Validators.required, Validators.email]],
    senha:  [''],
    perfil: ['OPERADOR', Validators.required],
    lojaId: [null as number | null],
  });

  ngOnInit() {
    this.carregar();
    this.lojaSvc.listar().subscribe((l: any[]) => this.lojas.set(l));
  }

  carregar() {
    this.svc.listar().subscribe(u => this.usuarios.set(u));
  }

  abrirForm() {
    this.editando.set(null);
    this.form.reset({ perfil: 'OPERADOR', senha: '', lojaId: null });
    this.form.get('senha')!.setValidators([
      Validators.required,
      Validators.minLength(6)
    ]);
    this.form.get('senha')!.updateValueAndValidity();
    this.modalAberto.set(true);
  }

  editarUsuario(u: any) {
    this.editando.set(u);
    this.form.patchValue({
      nome:   u.nome,
      email:  u.email,
      senha:  '',
      perfil: u.perfil,
      lojaId: u.lojaId ?? null,
    });
    this.form.get('senha')!.clearValidators();
    this.form.get('senha')!.updateValueAndValidity();
    this.modalAberto.set(true);
  }

  fecharForm() {
    this.modalAberto.set(false);
  }

  salvar() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const val = this.form.value as any;

    const obs = this.editando()
      ? this.svc.atualizar(this.editando().id, val)
      : this.svc.criar(val);

    obs.subscribe({
      next: () => {
        this.snack.open(
          this.editando() ? 'Usuário atualizado!' : 'Usuário criado!',
          '', { duration: 3000 }
        );
        this.fecharForm();
        this.carregar();
        this.saving.set(false);
      },
      error: err => {
        this.snack.open(
          err.error?.message || 'Erro ao salvar',
          '', { duration: 4000 }
        );
        this.saving.set(false);
      }
    });
  }

  alterarStatus(u: any) {
    const acao = u.ativo ? 'desativar' : 'ativar';
    if (!confirm(`Deseja ${acao} o usuário ${u.nome}?`)) return;
    this.svc.alterarStatus(u.id, !u.ativo).subscribe({
      next: () => {
        this.snack.open(`Usuário ${acao}do!`, '', { duration: 3000 });
        this.carregar();
      },
      error: err => this.snack.open(err.error?.message || 'Erro', '', { duration: 4000 })
    });
  }
}