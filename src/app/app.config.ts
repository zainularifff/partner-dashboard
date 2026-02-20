import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http'; // 1. Add this import
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient() // 2. Add this to the array
  ]
};
