import { HttpInterceptorFn } from '@angular/common/http';

export const systemTokenInterceptor: HttpInterceptorFn = (req, next) => {

  const cloned = req.clone({
    setHeaders: {
      'x-system-token': 'DashboardInternalSecure2026'
    }
  });

  return next(cloned);
};