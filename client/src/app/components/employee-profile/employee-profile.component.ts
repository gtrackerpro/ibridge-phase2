import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { EmployeeService, Employee } from '../../services/employee.service';
import { UploadService } from '../../services/upload.service';
import { MatchService } from '../../services/match.service';
import { TrainingService } from '../../services/training.service';
import { NotificationService } from '../../services/notification.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-employee-profile',
  templateUrl: './employee-profile.component.html',
  styleUrls: ['./employee-profile.component.scss']
})
export class EmployeeProfileComponent implements OnInit {
  employeeProfile: Employee | null = null;
  profileForm!: FormGroup;
  loading = false;
  updating = false;
  error = '';
  
  // Resume upload
  selectedResume: File | null = null;
  uploadingResume = false;
  
  // Tabs
  activeTab = 'profile';
  
  // Recommendations and matches
  recommendations: any[] = [];
  matches: any[] = [];
  trainingPlans: any[] = [];
  loadingRecommendations = false;
  loadingMatches = false;
  loadingTraining = false;
  
  // Managers data
  managers: any[] = [];
  loadingManagers = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private uploadService: UploadService,
    private matchService: MatchService,
    private trainingService: TrainingService,
    private notificationService: NotificationService,
    private errorHandler: ErrorHandlerService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadEmployeeProfile();
    this.loadManagers();
  }

  initializeForm(): void {
    this.profileForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      status: ['Available'],
      primarySkill: ['', [Validators.required]],
      primarySkillExperience: ['', [Validators.required, Validators.min(0)]],
      BU: ['', [Validators.required]],
      location: [''],
      managerUser: [''],
      secondarySkills: this.formBuilder.array([])
    });
  }

  get secondarySkillsArray(): FormArray {
    return this.profileForm.get('secondarySkills') as FormArray;
  }

  addSecondarySkill(): void {
    const skillGroup = this.formBuilder.group({
      skill: ['', [Validators.required]],
      experience: ['', [Validators.required, Validators.min(0)]]
    });
    this.secondarySkillsArray.push(skillGroup);
  }

  removeSecondarySkill(index: number): void {
    this.secondarySkillsArray.removeAt(index);
  }

  loadEmployeeProfile(): void {
    this.loading = true;
    this.error = '';

    this.employeeService.getEmployees().subscribe({
      next: (response) => {
        if (response.employees.length > 0) {
          this.employeeProfile = response.employees[0]; // Employee can only see their own profile
          this.populateForm(this.employeeProfile);
          this.loadRecommendations();
          this.loadMatches();
          this.loadTrainingPlans();
          this.loadResumeUrl(); // Load resume URL with signed link
        } else {
          this.error = 'Employee profile not found. Please contact your administrator.';
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = this.errorHandler.getErrorMessage(error);
        this.notificationService.error('Error', 'Failed to load employee profile');
      }
    });
  }

  populateForm(employee: Employee): void {
    this.profileForm.patchValue({
      name: employee.name,
      status: employee.status,
      primarySkill: employee.primarySkill,
      primarySkillExperience: employee.primarySkillExperience,
      BU: employee.BU,
      location: employee.location,
      managerUser: employee.managerUser?._id || ''
    });

    // Populate secondary skills
    const secondarySkillsArray = this.profileForm.get('secondarySkills') as FormArray;
    secondarySkillsArray.clear();
    
    employee.secondarySkills.forEach(skill => {
      const skillGroup = this.formBuilder.group({
        skill: [skill.skill, [Validators.required]],
        experience: [skill.experience, [Validators.required, Validators.min(0)]]
      });
      secondarySkillsArray.push(skillGroup);
    });
  }

  onResumeSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.type)) {
        this.selectedResume = file;
      } else {
        this.notificationService.error('Invalid File', 'Please select a valid file (PDF, DOC, DOCX)');
        event.target.value = '';
      }
    }
  }

  uploadResume(): void {
    if (!this.selectedResume || !this.employeeProfile) return;

    this.uploadingResume = true;

    this.uploadService.uploadResume(this.selectedResume, this.employeeProfile._id).subscribe({
      next: (response) => {
        this.uploadingResume = false;
        this.selectedResume = null;
        this.notificationService.success('Success', 'Resume uploaded successfully!');
        // Reload profile to get updated resume URL
        this.loadEmployeeProfile();
      },
      error: (error) => {
        this.uploadingResume = false;
        this.notificationService.error('Upload Failed', this.errorHandler.getErrorMessage(error));
      }
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid || !this.employeeProfile) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.updating = true;
    this.error = '';

    const formData = this.profileForm.value;

    // Clean up secondary skills - remove empty ones
    formData.secondarySkills = formData.secondarySkills.filter((skill: any) => 
      skill.skill && skill.skill.trim() && skill.experience !== null && skill.experience !== ''
    );

    this.employeeService.updateEmployee(this.employeeProfile._id, formData).subscribe({
      next: (response) => {
        this.updating = false;
        this.employeeProfile = response.employee;
        this.profileForm.markAsPristine();
        this.notificationService.success('Success', 'Profile updated successfully!');
      },
      error: (error) => {
        this.updating = false;
        this.error = this.errorHandler.getErrorMessage(error);
        this.notificationService.error('Update Failed', this.error);
      }
    });
  }

  loadRecommendations(): void {
    if (!this.employeeProfile) return;

    this.loadingRecommendations = true;
    this.matchService.getEmployeeRecommendations(this.employeeProfile._id).subscribe({
      next: (response) => {
        this.recommendations = response.recommendations;
        this.loadingRecommendations = false;
      },
      error: (error) => {
        this.loadingRecommendations = false;
        console.error('Error loading recommendations:', error);
      }
    });
  }

  loadMatches(): void {
    if (!this.employeeProfile) return;

    this.loadingMatches = true;
    this.matchService.getMatchesForEmployee(this.employeeProfile._id).subscribe({
      next: (response) => {
        this.matches = response.matches;
        this.loadingMatches = false;
      },
      error: (error) => {
        this.loadingMatches = false;
        console.error('Error loading matches:', error);
      }
    });
  }

  loadTrainingPlans(): void {
    this.loadingTraining = true;
    this.trainingService.getTrainingPlans().subscribe({
      next: (response) => {
        this.trainingPlans = response.trainingPlans;
        this.loadingTraining = false;
      },
      error: (error) => {
        this.loadingTraining = false;
        console.error('Error loading training plans:', error);
      }
    });
  }

  loadResumeUrl(): void {
    if (!this.employeeProfile || !this.employeeProfile.resumeUrl) return;

    // Get upload history to find the resume file
    this.uploadService.getUploadHistory().subscribe({
      next: (response) => {
        const resumeFile = response.uploads.find(upload => 
          upload.fileType === 'Resume' && 
          upload.associatedEntity?.entityType === 'Employee' &&
          upload.associatedEntity?.entityId === this.employeeProfile?._id
        );
        
        if (resumeFile) {
          // Get the signed URL for the resume
          this.uploadService.getFile(resumeFile._id).subscribe({
            next: (fileResponse) => {
              if (this.employeeProfile) {
                this.employeeProfile.resumeUrl = fileResponse.fileUpload.downloadUrl;
              }
            },
            error: (error) => {
              console.error('Error getting resume signed URL:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('Error loading upload history:', error);
      }
    });
  }

  loadManagers(): void {
    this.loadingManagers = true;
    this.userService.getManagers().subscribe({
      next: (response) => {
        this.managers = response.managers;
        this.loadingManagers = false;
      },
      error: (error) => {
        this.loadingManagers = false;
        console.error('Error loading managers:', error);
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  getMatchTypeColor(matchType: string): string {
    switch (matchType) {
      case 'Exact': return 'text-green-600';
      case 'Near': return 'text-yellow-600';
      case 'Near': return 'text-yellow-600';
      case 'Not Eligible': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Approved': return 'text-green-600';
      case 'Pending': return 'text-yellow-600';
      case 'Rejected': return 'text-red-600';
      case 'Training Required': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }

  getTrainingStatusColor(status: string): string {
    switch (status) {
      case 'Completed': return 'text-green-600';
      case 'In Progress': return 'text-blue-600';
      case 'Assigned': return 'text-yellow-600';
      case 'On Hold': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  resetForm(): void {
    if (this.employeeProfile) {
      this.profileForm.reset();
      this.populateForm(this.employeeProfile);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }
}