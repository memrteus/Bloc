import { HttpInterceptorFn } from '@angular/common/http';

import { inject } from '@angular/core';

import { AppConfigService } from '../services/app-config.service';

export const apiPrefixInterceptor: HttpInterceptorFn = (request, next) => {
	if (/^https?:\/\//i.test(request.url)) {
		return next(request);
	}

	const config = inject(AppConfigService);
	const baseUrl = config.environment.apiBaseUrl.replace(/\/$/, '');
	const requestUrl = request.url.startsWith('/') ? request.url : `/${request.url}`;

	return next(request.clone({ url: `${baseUrl}${requestUrl}` }));
};
