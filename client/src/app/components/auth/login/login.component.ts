import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { ErrorHandlerService } from '../../../services/error-handler.service';
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
    private errorHandler: ErrorHandlerService
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
    
    // Make health check request to wake up server
    this.http.get(`${environment.apiUrl}/health`).subscribe({
      next: (response: any) => {
        this.refreshing = false;
        this.notificationService.success('Server Ready', 'Server is awake and ready for login');
      },
      error: (error) => {
        this.refreshing = false;
        const errorMessage = this.errorHandler.getErrorMessage(error);
        this.notificationService.error('Server Error', `Failed to wake up server: ${errorMessage}`);
      }
    });
  }
}
