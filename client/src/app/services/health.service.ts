import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, timeout, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'timeout';
  response?: any;
  error?: string;
  responseTime?: number;
}

export interface ServicesHealthStatus {
  backend: HealthStatus;
  fastapi: HealthStatus;
  overall: 'healthy' | 'partial' | 'unhealthy';
}

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private readonly FASTAPI_BASE_URL = 'https://ibridge-ai-semantic-matching-service.onrender.com';
  private readonly TIMEOUT_DURATION = 30000; // 30 seconds timeout

  constructor(private http: HttpClient) {}

  /**
   * Check backend server health
   */
  checkBackendHealth(): Observable<HealthStatus> {
    const startTime = Date.now();
    
    return this.http.get(`${environment.apiUrl}/health`)
      .pipe(
        timeout(this.TIMEOUT_DURATION),
        map((response: any) => ({
          service: 'backend',
          status: 'healthy' as const,
          response,
          responseTime: Date.now() - startTime
        })),
        catchError((error) => {
          const status: HealthStatus = {
            service: 'backend',
            status: error.name === 'TimeoutError' ? 'timeout' : 'unhealthy',
            error: error.message || 'Unknown error',
            responseTime: Date.now() - startTime
          };
          return of(status);
        })
      );
  }

  /**
   * Check FastAPI service health
   */
  checkFastAPIHealth(): Observable<HealthStatus> {
    const startTime = Date.now();
    
    return this.http.get(`${this.FASTAPI_BASE_URL}/health`)
      .pipe(
        timeout(this.TIMEOUT_DURATION),
        map((response: any) => ({
          service: 'fastapi',
          status: 'healthy' as const,
          response,
          responseTime: Date.now() - startTime
        })),
        catchError((error) => {
          const status: HealthStatus = {
            service: 'fastapi',
            status: error.name === 'TimeoutError' ? 'timeout' : 'unhealthy',
            error: error.message || 'Unknown error',
            responseTime: Date.now() - startTime
          };
          return of(status);
        })
      );
  }

  /**
   * Check FastAPI docs endpoint (to wake up the service)
   */
  checkFastAPIDocs(): Observable<HealthStatus> {
    const startTime = Date.now();
    
    return this.http.get(`${this.FASTAPI_BASE_URL}/docs`, { responseType: 'text' })
      .pipe(
        timeout(this.TIMEOUT_DURATION),
        map((response: any) => ({
          service: 'fastapi-docs',
          status: 'healthy' as const,
          response: 'Docs page loaded successfully',
          responseTime: Date.now() - startTime
        })),
        catchError((error) => {
          const status: HealthStatus = {
            service: 'fastapi-docs',
            status: error.name === 'TimeoutError' ? 'timeout' : 'unhealthy',
            error: error.message || 'Unknown error',
            responseTime: Date.now() - startTime
          };
          return of(status);
        })
      );
  }

  /**
   * Check all services health
   */
  checkAllServicesHealth(): Observable<ServicesHealthStatus> {
    return forkJoin({
      backend: this.checkBackendHealth(),
      fastapi: this.checkFastAPIHealth()
    }).pipe(
      map(({ backend, fastapi }) => {
        let overall: 'healthy' | 'partial' | 'unhealthy';
        
        if (backend.status === 'healthy' && fastapi.status === 'healthy') {
          overall = 'healthy';
        } else if (backend.status === 'healthy' || fastapi.status === 'healthy') {
          overall = 'partial';
        } else {
          overall = 'unhealthy';
        }

        return {
          backend,
          fastapi,
          overall
        };
      })
    );
  }

  /**
   * Wake up services by calling their endpoints
   */
  wakeUpServices(): Observable<ServicesHealthStatus> {
    // First try to wake up services, then check their health
    return forkJoin({
      backend: this.checkBackendHealth(),
      fastapi: this.checkFastAPIDocs().pipe(
        // After checking docs, check health
        map(() => this.checkFastAPIHealth()),
        // Flatten the observable
        switchMap(healthObs => healthObs)
      )
    }).pipe(
      map(({ backend, fastapi }) => {
        let overall: 'healthy' | 'partial' | 'unhealthy';
        
        if (backend.status === 'healthy' && fastapi.status === 'healthy') {
          overall = 'healthy';
        } else if (backend.status === 'healthy' || fastapi.status === 'healthy') {
          overall = 'partial';
        } else {
          overall = 'unhealthy';
        }

        return {
          backend,
          fastapi,
          overall
        };
      })
    );
  }

  /**
   * Get service status message
   */
  getStatusMessage(healthStatus: ServicesHealthStatus): string {
    switch (healthStatus.overall) {
      case 'healthy':
        return 'All services are healthy and ready';
      case 'partial':
        const healthyServices = [];
        const unhealthyServices = [];
        
        if (healthStatus.backend.status === 'healthy') {
          healthyServices.push('Backend');
        } else {
          unhealthyServices.push('Backend');
        }
        
        if (healthStatus.fastapi.status === 'healthy') {
          healthyServices.push('FastAPI');
        } else {
          unhealthyServices.push('FastAPI');
        }
        
        return `${healthyServices.join(', ')} ready. ${unhealthyServices.join(', ')} may be sleeping.`;
      case 'unhealthy':
        return 'Services are not responding. Please try again.';
      default:
        return 'Unknown status';
    }
  }
}
