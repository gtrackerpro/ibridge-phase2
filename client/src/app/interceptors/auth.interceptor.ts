import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add authorization header with jwt token if available
    const token = this.authService.getToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Check if we're currently on a public route (login/register)
          const currentUrl = this.router.url;
          const isPublicRoute = currentUrl === '/login' || currentUrl === '/register';
          
          // Always logout to clear invalid tokens
          this.authService.logout();
          
          // Only redirect if we're not already on a public route
          if (!isPublicRoute) {
            this.router.navigate(['/login']);
          }
        }

        return throwError(error);
      })
    );
  }
}