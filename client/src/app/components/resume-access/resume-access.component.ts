import { Component, OnInit } from '@angular/core';
import { UploadService } from '../../services/upload.service';
import { AuthService } from '../../services/auth.service';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-resume-access',
  template: `
    <div class="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">My Resume</h2>
        
        <div *ngIf="loading" class="flex justify-center py-8">
          <div class="spinner"></div>
        </div>
        
        <div *ngIf="!loading && !resumeUrl" class="text-center py-8">
          <div class="text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p class="text-lg">No resume uploaded yet</p>
            <p class="text-sm text-gray-400 mt-2">Contact your admin to upload your resume</p>
          </div>
        </div>
        
        <div *ngIf="!loading && resumeUrl" class="text-center">
          <div class="mb-6">
            <svg class="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900">Resume Available</h3>
            <p class="text-sm text-gray-500 mt-1">Your resume is ready to view</p>
          </div>
          
          <div class="space-y-4">
            <a 
              [href]="resumeUrl" 
              target="_blank" 
              class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              View Resume
            </a>
            
            <button 
              (click)="refreshResumeUrl()" 
              [disabled]="refreshing"
              class="ml-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg *ngIf="refreshing" class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg *ngIf="!refreshing" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh Link
            </button>
          </div>
          
          <div class="mt-4 text-xs text-gray-500">
            <p>Secure link expires in 1 hour</p>
            <p>Click "Refresh Link" to generate a new access link</p>
          </div>
        </div>
        
        <div *ngIf="error" class="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error</h3>
              <p class="text-sm text-red-700 mt-1">{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResumeAccessComponent implements OnInit {
  resumeUrl: string | null = null;
  loading = false;
  refreshing = false;
  error = '';

  constructor(
    private uploadService: UploadService,
    private authService: AuthService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.loadResumeUrl();
  }

  loadResumeUrl(): void {
    this.loading = true;
    this.error = '';

    // First, get the current employee profile
    this.employeeService.getEmployees().subscribe({
      next: (response) => {
        if (response.employees.length > 0) {
          const employee = response.employees[0];
          this.findAndLoadResume(employee._id);
        } else {
          this.error = 'Employee profile not found';
          this.loading = false;
        }
      },
      error: (error) => {
        this.error = 'Failed to load employee profile';
        this.loading = false;
      }
    });
  }

  findAndLoadResume(employeeId: string): void {
    // Get upload history to find the resume file
    this.uploadService.getUploadHistory().subscribe({
      next: (response) => {
        const resumeFile = response.uploads.find(upload => 
          upload.fileType === 'Resume' && 
          upload.associatedEntity?.entityType === 'Employee' &&
          upload.associatedEntity?.entityId === employeeId
        );
        
        if (resumeFile) {
          // Get the signed URL for the resume
          this.uploadService.getFile(resumeFile._id).subscribe({
            next: (fileResponse) => {
              this.resumeUrl = fileResponse.fileUpload.downloadUrl;
              this.loading = false;
            },
            error: (error) => {
              this.error = 'Failed to generate resume access link';
              this.loading = false;
            }
          });
        } else {
          this.resumeUrl = null;
          this.loading = false;
        }
      },
      error: (error) => {
        this.error = 'Failed to load resume information';
        this.loading = false;
      }
    });
  }

  refreshResumeUrl(): void {
    this.refreshing = true;
    this.error = '';

    // Reload the resume URL
    this.employeeService.getEmployees().subscribe({
      next: (response) => {
        if (response.employees.length > 0) {
          const employee = response.employees[0];
          this.findAndLoadResume(employee._id);
          this.refreshing = false;
        } else {
          this.error = 'Employee profile not found';
          this.refreshing = false;
        }
      },
      error: (error) => {
        this.error = 'Failed to refresh resume link';
        this.refreshing = false;
      }
    });
  }
}
