import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { SecurityService } from './services/security.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'iBridge AI';
  loading = false;
  showUserMenu = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private securityService: SecurityService
  ) {}

  ngOnInit() {
    // Initialize security headers
    this.securityService.setSecurityHeaders();
    
    // Log application start
    this.securityService.logSecurityEvent('app_init', {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }

  logout() {
    this.showUserMenu = false;
    
    // Clear sensitive data securely
    this.securityService.clearSensitiveData();
    
    // Log logout event
    this.securityService.logSecurityEvent('user_logout', {
      timestamp: new Date().toISOString()
    });
    
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
