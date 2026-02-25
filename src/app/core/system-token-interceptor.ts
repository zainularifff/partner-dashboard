import { HttpInterceptorFn } from '@angular/common/http';

export const systemTokenInterceptor: HttpInterceptorFn = (req, next) => {

  const cloned = req.clone({
    setHeaders: {
      'x-system-token': '4b6f0e7d8a9c1f2e3d4c5b6a7e8f9d0c'
    }
  });

  return next(cloned);
};