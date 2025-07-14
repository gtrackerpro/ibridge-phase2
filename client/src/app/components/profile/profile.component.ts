import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ErrorHandlerService } from '../../services/error-handler.service';

interface PasswordStrength {
  level: 'weak' | 'medium' | 'strong';
  percentage: number;
  message: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  currentUser: User | null = null;
  
  // Loading states
  updatingProfile = false;
  changingPassword = false;
  
  // Error states
  profileError = '';
  passwordError = '';
  
  // Password strength
  passwordStrength: PasswordStrength = {
    level: 'weak',
    percentage: 0,
    message: ''
  };

  constructor(
    private formBuilder: FormBuilder,
    public authService: AuthService,
    private notificationService: NotificationService,
    private errorHandler: ErrorHandlerService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.initializeForms();
    this.loadUserProfile();
  }

  initializeForms(): void {
    this.profileForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]]
    });

    this.passwordForm = this.formBuilder.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });

    // Watch for password changes to update strength indicator
    this.passwordForm.get('newPassword')?.valueChanges.subscribe(password => {
      if (password) {
        this.passwordStrength = this.calculatePasswordStrength(password);
      } else {
        this.passwordStrength = { level: 'weak', percentage: 0, message: '' };
      }
    });
  }

  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (!newPassword || !confirmPassword) {
      return null;
    }
    
    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  calculatePasswordStrength(password: string): PasswordStrength {
    let score = 0;
    let feedback: string[] = [];

    // Length check
    if (password.length >= 8) {
      score += 25;
    } else {
      feedback.push('at least 8 characters');
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 25;
    } else {
      feedback.push('uppercase letters');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 25;
    } else {
      feedback.push('lowercase letters');
    }

    // Number or special character check
    if (/[\d\W]/.test(password)) {
      score += 25;
    } else {
      feedback.push('numbers or special characters');
    }

    let level: 'weak' | 'medium' | 'strong';
    let message: string;

    if (score < 50) {
      level = 'weak';
      message = `Weak password. Add ${feedback.join(', ')}.`;
    } else if (score < 100) {
      level = 'medium';
      message = `Medium strength. Consider adding ${feedback.join(', ')}.`;
    } else {
      level = 'strong';
      message = 'Strong password!';
    }

    return {
      level,
      percentage: score,
      message
    };
  }

  loadUserProfile(): void {
    if (this.currentUser) {
      this.profileForm.patchValue({
        name: this.currentUser.name
      });
    }
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.updatingProfile = true;
    this.profileError = '';

    const { name } = this.profileForm.value;

    this.authService.updateProfile(name).subscribe({
      next: (response) => {
        this.updatingProfile = false;
        this.currentUser = response.user;
        this.profileForm.markAsPristine();
        this.notificationService.success('Success', 'Profile updated successfully!');
      },
      error: (error) => {
        this.updatingProfile = false;
        this.profileError = this.errorHandler.getErrorMessage(error);
        this.notificationService.error('Error', this.profileError);
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.changingPassword = true;
    this.passwordError = '';

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    this.authService.changePassword(currentPassword, newPassword, confirmPassword).subscribe({
      next: (response) => {
        this.changingPassword = false;
        this.passwordForm.reset();
        this.passwordStrength = { level: 'weak', percentage: 0, message: '' };
        this.notificationService.success('Success', 'Password changed successfully!');
      },
      error: (error) => {
        this.changingPassword = false;
        this.passwordError = this.errorHandler.getErrorMessage(error);
        this.notificationService.error('Error', this.passwordError);
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}