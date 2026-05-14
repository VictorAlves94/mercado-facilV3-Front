import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, inject,
  signal
} from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { LojaService } from '../../core/services/services'; // ← services.ts
import { Loja } from '../../core/models/models';             // ← models.ts

@Component({
  selector: 'app-loja-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    AsyncPipe,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="loja-selector-wrapper">

      <button
        mat-raised-button
        color="primary"
        class="loja-btn"
        [matMenuTriggerFor]="menuLojas"
        [matTooltip]="lojaNomeAtual()"
        matTooltipPosition="below"
        aria-label="Selecionar loja"
      >
        <mat-icon>storefront</mat-icon>

        <span class="loja-nome">
          {{ lojaNomeAtual() }}
        </span>

        <mat-icon class="chevron">expand_more</mat-icon>
      </button>

      <mat-menu #menuLojas="matMenu" xPosition="before">

        <div class="menu-header">
          <mat-icon>store</mat-icon>
          <span>Trocar Loja</span>
        </div>

        @for (loja of lojas(); track loja.id) {
          <button
            mat-menu-item
            (click)="selecionarLoja(loja)"
            [class.loja-ativa]="loja.id === (lojaService.lojaSelecionadaId$ | async)"
          >
            <mat-icon>
              {{ loja.id === (lojaService.lojaSelecionadaId$ | async)
                  ? 'check_circle'
                  : 'radio_button_unchecked' }}
            </mat-icon>
            <span>{{ loja.nome }}</span>
          </button>
        }

        @if (lojas().length === 0) {
          <button mat-menu-item disabled>
            <mat-icon>error_outline</mat-icon>
            <span>Nenhuma loja disponível</span>
          </button>
        }

      </mat-menu>
    </div>
  `,
  styles: [`
    .loja-selector-wrapper {
      display: flex;
      align-items: center;
    }

    .loja-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 40px;
      border-radius: 8px !important;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.3px;
      transition: box-shadow 0.2s ease;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18) !important;
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        line-height: 18px;
      }
    }

    .loja-nome {
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chevron {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      margin-left: -4px;
      opacity: 0.7;
    }

    .menu-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      opacity: 0.5;
      pointer-events: none;
      user-select: none;

      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
    }

    ::ng-deep .loja-ativa {
      font-weight: 700 !important;
      background: rgba(21, 101, 192, 0.06) !important;
      mat-icon { color: #1565c0 !important; }
    }

    @media (max-width: 600px) {
      .loja-nome, .chevron { display: none; }
      .loja-btn {
        min-width: 40px !important;
        padding: 0 8px !important;
      }
    }
  `],
})
export class LojaSelectorComponent implements OnInit, OnDestroy {

  readonly lojaService = inject(LojaService); // public para usar no template
  private readonly destroy$ = new Subject<void>();

  lojas        = signal<Loja[]>([]);
  lojaNomeAtual = signal('Selecionar Loja');

  ngOnInit(): void {
    // Carregar lista de lojas
    this.lojaService.listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lista) => {
          this.lojas.set(lista);

          // Auto-selecionar a primeira se nenhuma estiver salva
          const idSalvo = this.lojaService.getLojaSelecionadaId();
          if (!idSalvo && lista.length > 0) {
            this.selecionarLoja(lista[0]);
          } else if (idSalvo) {
            // Atualizar o nome exibido com base no id salvo
            const lojaSalva = lista.find(l => l.id === idSalvo);
            if (lojaSalva) this.lojaNomeAtual.set(lojaSalva.nome);
            window.location.reload();
          }
        },
        error: () => console.error('[LojaSelector] Falha ao carregar lojas.')
      });

    // Atualizar nome exibido quando o id mudar
    this.lojaService.lojaSelecionadaId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((id: number | null) => {
        const loja = this.lojas().find(l => l.id === id);
        this.lojaNomeAtual.set(loja?.nome ?? 'Selecionar Loja');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selecionarLoja(loja: Loja): void {
    this.lojaService.setLojaSelecionada(loja.id);
    this.lojaNomeAtual.set(loja.nome);
  }
}
