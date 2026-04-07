import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AppEnvironment } from '../models/app-environment.model';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  readonly environment: AppEnvironment = environment;
}
