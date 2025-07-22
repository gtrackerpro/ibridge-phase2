import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { UserService, User, UserStats } from '../../../services/user.service';
import { NotificationService } from '../../../services/notification.service';
import { ErrorHandlerService } from '../../../services/error-handler.service';
import { CsvExportService } from '../../../services/csv-export.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  userStats: UserStats = {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminUsers: 0,
    rmUsers: 0,
    employeeUsers: 0,
    hrUsers: 0,
    managerUsers: 0
  };
  
  loading = false;
  selectedUser: User | null = null;
  currentUserId: string;

  // Filters
  searchTerm = '';
  roleFilter = '';
  statusFilter = '';

  // Modals
  showCreateModal = false;
  showEditModal = false;
  showViewModal = false;

  // Forms
  createForm!: FormGroup;
  editForm!: FormGroup;

  // Loading states
  creating = false;
  updating = false;

  // Error states
  createError = '';
  editError = '';

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private notificationService: NotificationService,
    private errorHandler: ErrorHandlerService,
    private formBuilder: FormBuilder,
    private csvExportService: CsvExportService
  ) {
    this.currentUserId = this.authService.getCurrentUser()?.id || '';
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadUsers();
    this.loadUserStats();
  }

  initializeForms(): void {
    this.createForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['Employee', [Validators.required]]
    });

    this.editForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      role: ['Employee', [Validators.required]],
      isActive: [true]
    });
  }

  loadUsers(): void {
    this.loading = true;
    
    const filters = {
      search: this.searchTerm || undefined,
      role: this.roleFilter || undefined,
      status: this.statusFilter || undefined
    };

    this.userService.getUsers(filters).subscribe({
      next: (response) => {
        this.users = response.users;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.notificationService.error('Error', 'Failed to load users');
        console.error('Error loading users:', error);
      }
    });
  }

  loadUserStats(): void {
    this.userService.getUserStats().subscribe({
      next: (response) => {
        this.userStats = response.stats;
      },
      error: (error) => {
        console.error('Error loading user stats:', error);
      }
    });
  }

  onSearch(): void {
    this.loadUsers();
  }

  onFilterChange(): void {
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.loadUsers();
  }

  // View user
  viewUser(user: User): void {
    this.selectedUser = user;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.selectedUser = null;
    this.showViewModal = false;
  }

  // Create user
  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createForm.reset();
    this.createForm.patchValue({ role: 'Employee' });
    this.createError = '';
  }

  createUser(): void {
    if (this.createForm.invalid) {
      this.markFormGroupTouched(this.createForm);
      return;
    }

    this.creating = true;
    this.createError = '';

    this.userService.createUser(this.createForm.value).subscribe({
      next: (response) => {
        this.creating = false;
        this.closeCreateModal();
        this.loadUsers();
        this.loadUserStats();
        this.notificationService.success('Success', `User ${response.user.name} created successfully`);
      },
      error: (error) => {
        this.creating = false;
        this.createError = this.errorHandler.getErrorMessage(error);
        this.notificationService.error('Error', this.createError);
      }
    });
  }

  // Edit user
  editUser(user: User): void {
    this.selectedUser = user;
    this.editForm.patchValue({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
    this.editForm.reset();
    this.editError = '';
  }

  updateUser(): void {
    if (this.editForm.invalid || !this.selectedUser) {
      this.markFormGroupTouched(this.editForm);
      return;
    }

    this.updating = true;
    this.editError = '';

    this.userService.updateUser(this.selectedUser._id, this.editForm.value).subscribe({
      next: (response) => {
        this.updating = false;
        this.closeEditModal();
        this.loadUsers();
        this.loadUserStats();
        this.notificationService.success('Success', `User ${response.user.name} updated successfully`);
      },
      error: (error) => {
        this.updating = false;
        this.editError = this.errorHandler.getErrorMessage(error);
        this.notificationService.error('Error', this.editError);
      }
    });
  }

  // Toggle user status
  toggleUserStatus(user: User): void {
    if (user._id === this.currentUserId) {
      this.notificationService.warning('Warning', 'You cannot modify your own account status');
      return;
    }

    const action = user.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      this.userService.toggleUserStatus(user._id).subscribe({
        next: (response) => {
          this.loadUsers();
          this.loadUserStats();
          this.notificationService.success('Success', response.message);
        },
        error: (error) => {
          this.notificationService.error('Error', `Failed to ${action} user`);
          console.error(`Error ${action}ing user:`, error);
        }
      });
    }
  }

  // Delete user
  deleteUser(user: User): void {
    if (user._id === this.currentUserId) {
      this.notificationService.warning('Warning', 'You cannot delete your own account');
      return;
    }

    if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      this.userService.deleteUser(user._id).subscribe({
        next: (response) => {
          this.loadUsers();
          this.loadUserStats();
          this.notificationService.success('Success', `User ${response.user.name} deleted successfully`);
        },
        error: (error) => {
          this.notificationService.error('Error', 'Failed to delete user');
          console.error('Error deleting user:', error);
        }
      });
    }
  }

  exportUsers(): void {
    if (this.users.length === 0) {
      this.notificationService.warning('No Data', 'No users available to export');
      return;
    }

    const filename = this.csvExportService.generateFilename('users-export');
    this.csvExportService.exportUsers(this.users, filename);
    this.notificationService.success('Export Complete', `Exported ${this.users.length} users to ${filename}`);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}