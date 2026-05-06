import { Component, inject, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { LojaService } from '../../../core/services/services';
import { Loja } from '../../../core/models/models';


@Component({
  selector: 'app-loja-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatFormFieldModule, MatIconModule],
  template: `
    <mat-form-field appearance="outline" class="loja-field">
      <mat-label>Loja</mat-label>
      <mat-select [(ngModel)]="lojaSelecionadaId"
                  (selectionChange)="onChange($event.value)">
        <mat-option [value]="null">
          🏪 Todas as lojas
        </mat-option>
        @for (loja of lojas(); track loja.id) {
          <mat-option [value]="loja.id">
            {{ loja.nome }}
            <span style="font-size:.7rem;color:#94a3b8;margin-left:.5rem">
              {{ loja.codigo }}
            </span>
          </mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: [`
    .loja-field {
      min-width: 200px;
      margin-bottom: -1.25em;
    }
  `]
})
export class LojaSelectorComponent implements OnInit {
  private lojaSvc = inject(LojaService);

  lojas = signal<Loja[]>([]);
  lojaSelecionadaId: number | null = null;

  lojaChange = output<number | null>();

  ngOnInit() {
    this.lojaSvc.listar().subscribe(l => this.lojas.set(l));
  }

  onChange(id: number | null) {
    this.lojaChange.emit(id);
  }
}