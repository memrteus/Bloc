import { HttpInterceptorFn } from '@angular/common/http';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (/^https?:\/\//i.test(request.url) || request.headers.has('Authorization')) {
    return next(request);
  }

  const requestUrl = request.url.startsWith('/') ? request.url : `/${request.url}`;
  const requiresAuth =
    /^\/auth\/me(?:[/?#]|$)/.test(requestUrl) ||
    /^\/auth\/logout(?:[/?#]|$)/.test(requestUrl) ||
    /^\/sidequests\/my-joined(?:[/?#]|$)/.test(requestUrl) ||
    (/^\/sidequests\/(?!discover(?:[/?#]|$))[^/?#]+(?:[/?#]|$)/.test(requestUrl) && request.method === 'GET') ||
    (/^\/sidequests(?:[/?#]|$)/.test(requestUrl) && request.method !== 'GET');

  if (!requiresAuth) {
    return next(request);
  }

  const accessToken = localStorage.getItem('bloc.accessToken');
  if (!accessToken) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    })
  );
};
