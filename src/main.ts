import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// 🔥 ADICIONA ISSO
import localePt from '@angular/common/locales/pt';
import { registerLocaleData } from '@angular/common';

// 🔥 REGISTRA O LOCALE
registerLocaleData(localePt);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));