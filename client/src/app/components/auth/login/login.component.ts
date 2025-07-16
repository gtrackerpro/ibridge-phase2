import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { ErrorHandlerService } from '../../../services/error-handler.service';
import { HealthService } from '../../../services/health.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  refreshing = false;
  error = '';
  returnUrl = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private notificationService: NotificationService,
    private errorHandler: ErrorHandlerService,
    private healthService: HealthService
  ) {
    // Redirect to dashboard if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Get return url from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.notificationService.success('Login Successful', `Welcome back, ${response.user.name}!`);
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        this.error = this.errorHandler.getErrorMessage(error);
        this.notificationService.error('Login Failed', this.error);
        this.loading = false;
      }
    });
  }

  refreshServer(): void {
    this.refreshing = true;
    this.error = '';
    
    // Use the health service to check all services and wake them up
    this.healthService.wakeUpServices().subscribe({
      next: (healthStatus) => {
        this.refreshing = false;
        const message = this.healthService.getStatusMessage(healthStatus);
        
        // Show response time information
        const responseDetails = [];
        if (healthStatus.backend.responseTime) {
          responseDetails.push(`Backend: ${healthStatus.backend.responseTime}ms`);
        }
        if (healthStatus.fastapi.responseTime) {
          responseDetails.push(`FastAPI: ${healthStatus.fastapi.responseTime}ms`);
        }
        
        const detailedMessage = responseDetails.length > 0 
          ? `${message} (${responseDetails.join(', ')})`
          : message;
        
        switch (healthStatus.overall) {
          case 'healthy':
            this.notificationService.success('Services Ready', detailedMessage);
            break;
          case 'partial':
            this.notificationService.warning('Partial Service', detailedMessage);
            break;
          case 'unhealthy':
            this.notificationService.error('Services Error', detailedMessage);
            break;
        }
        
        // Log detailed status for debugging
        console.log('Health check results:', healthStatus);
      },
      error: (error) => {
        this.refreshing = false;
        const errorMessage = this.errorHandler.getErrorMessage(error);
        this.notificationService.error('Server Error', `Failed to check services: ${errorMessage}`);
        console.error('Health check error:', error);
      }
    });
  }
}
