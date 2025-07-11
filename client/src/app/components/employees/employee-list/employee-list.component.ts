import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { EmployeeService, Employee } from '../../../services/employee.service';
import { UploadService } from '../../../services/upload.service';

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnInit {
  employees: Employee[] = [];
  loading = false;
  selectedEmployee: Employee | null = null;
  
  // Search and filter
  searchFilters = {
    skill: '',
    minExperience: null as number | null,
    status: ''
  };

  // CSV Upload
  showUploadModal = false;
  selectedFile: File | null = null;
  uploading = false;
  uploadError = '';

  constructor(
    public authService: AuthService,
    private employeeService: EmployeeService,
    private uploadService: UploadService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.employeeService.getEmployees().subscribe({
      next: (response) => {
        this.employees = response.employees;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    if (this.searchFilters.skill || this.searchFilters.minExperience || this.searchFilters.status) {
      this.loading = true;
      this.employeeService.searchEmployees(
        this.searchFilters.skill || undefined,
        this.searchFilters.minExperience || undefined,
        this.searchFilters.status || undefined
      ).subscribe({
        next: (response) => {
          this.employees = response.employees;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error searching employees:', error);
          this.loading = false;
        }
      });
    } else {
      this.loadEmployees();
    }
  }

  clearFilters(): void {
    this.searchFilters = {
      skill: '',
      minExperience: null,
      status: ''
    };
    this.loadEmployees();
  }

  viewEmployee(employee: Employee): void {
    this.selectedEmployee = employee;
  }

  closeEmployeeModal(): void {
    this.selectedEmployee = null;
  }

  editEmployee(employee: Employee): void {
    this.router.navigate(['/employees', employee._id, 'edit']);
  }

  canEditEmployee(employee: Employee): boolean {
    if (this.authService.isAdmin()) {
      return true;
    }
    if (this.authService.isRM()) {
      return true;
    }
    if (this.authService.isEmployee()) {
      return employee.email === this.authService.getCurrentUser()?.email;
    }
    return false;
  }

  deleteEmployee(employee: Employee): void {
    if (confirm(`Are you sure you want to delete ${employee.name}?`)) {
      this.employeeService.deleteEmployee(employee._id).subscribe({
        next: () => {
          this.loadEmployees();
        },
        error: (error) => {
          console.error('Error deleting employee:', error);
          alert('Failed to delete employee');
        }
      });
    }
  }

  // CSV Upload methods
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      this.selectedFile = file;
      this.uploadError = '';
    } else {
      this.selectedFile = null;
      this.uploadError = 'Please select a valid CSV file';
    }
  }

  uploadCSV(): void {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.uploadError = '';

    this.uploadService.uploadCSV(this.selectedFile, 'employees').subscribe({
      next: (response) => {
        this.uploading = false;
        this.closeUploadModal();
        this.loadEmployees();
        alert('CSV uploaded successfully!');
      },
      error: (error) => {
        this.uploading = false;
        this.uploadError = error.error?.message || 'Upload failed';
      }
    });
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.selectedFile = null;
    this.uploadError = '';
  }
}