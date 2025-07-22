import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { EmployeeService, Employee } from '../../../services/employee.service';
import { UserService, User } from '../../../services/user.service';
import { UploadService } from '../../../services/upload.service';

@Component({
  selector: 'app-employee-form',
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.scss']
})
export class EmployeeFormComponent implements OnInit {
  employeeForm!: FormGroup;
  loading = false;
  error = '';
  isEditMode = false;
  employeeId: string | null = null;
  currentEmployee: Employee | null = null;
  selectedResume: File | null = null;
  managers: User[] = [];
  loadingManagers = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private employeeService: EmployeeService,
    private userService: UserService,
    private uploadService: UploadService
  ) { }

  ngOnInit(): void {
    this.employeeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.employeeId;

    this.initializeForm();

    this.loadManagers();

    if (this.isEditMode && this.employeeId) {
      this.loadEmployee();
    }
  }

  initializeForm(): void {
    this.employeeForm = this.formBuilder.group({
      employeeId: ['', [Validators.required]],
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
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
    return this.employeeForm.get('secondarySkills') as FormArray;
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

  loadManagers(): void {
    this.loadingManagers = true;
    this.userService.getManagers().subscribe({
      next: (response) => {
        this.managers = response.managers;
        this.loadingManagers = false;
      },
      error: (error) => {
        console.error('Error loading managers:', error);
        this.loadingManagers = false;
      }
    });
  }

  loadEmployee(): void {
    if (!this.employeeId) return;

    this.loading = true;
    this.employeeService.getEmployee(this.employeeId).subscribe({
      next: (response) => {
        this.currentEmployee = response.employee;
        this.populateForm(response.employee);
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load employee data';
        this.loading = false;
      }
    });
  }

  populateForm(employee: Employee): void {
    this.employeeForm.patchValue({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      status: employee.status,
      primarySkill: employee.primarySkill,
      primarySkillExperience: employee.primarySkillExperience,
      BU: employee.BU,
      location: employee.location,
      managerUser: employee.managerUser?._id || ''
    });

    // Populate secondary skills
    const secondarySkillsArray = this.employeeForm.get('secondarySkills') as FormArray;
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
        alert('Please select a valid file (PDF, DOC, DOCX)');
        event.target.value = '';
      }
    }
  }

  onSubmit(): void {
    if (this.employeeForm.invalid) {
      this.markFormGroupTouched(this.employeeForm);
      return;
    }

    this.loading = true;
    this.error = '';

    const formData = this.employeeForm.value;

    // Clean up secondary skills - remove empty ones
    formData.secondarySkills = formData.secondarySkills.filter((skill: any) => 
      skill.skill && skill.skill.trim() && skill.experience !== null && skill.experience !== ''
    );

    const saveEmployee = () => {
      if (this.isEditMode && this.employeeId) {
        this.employeeService.updateEmployee(this.employeeId, formData).subscribe({
          next: (response) => {
            this.router.navigate(['/employees']);
          },
          error: (error) => {
            this.error = error.error?.message || 'Failed to update employee';
            this.loading = false;
          }
        });
      } else {
        this.employeeService.createEmployee(formData).subscribe({
          next: (response) => {
            if (this.selectedResume) {
              // Upload resume after creating employee
              this.uploadService.uploadResume(this.selectedResume, response.employee._id).subscribe({
                next: () => {
                  this.router.navigate(['/employees']);
                },
                error: (error) => {
                  console.error('Resume upload failed:', error);
                  // Still navigate to employees list even if resume upload fails
                  this.router.navigate(['/employees']);
                }
              });
            } else {
              this.router.navigate(['/employees']);
            }
          },
          error: (error) => {
            this.error = error.error?.message || 'Failed to create employee';
            this.loading = false;
          }
        });
      }
    };

    // If resume is selected and we're editing, upload it first
    if (this.selectedResume && this.isEditMode && this.employeeId) {
      this.uploadService.uploadResume(this.selectedResume, this.employeeId).subscribe({
        next: () => {
          saveEmployee();
        },
        error: (error) => {
          console.error('Resume upload failed:', error);
          // Continue with saving employee even if resume upload fails
          saveEmployee();
        }
      });
    } else {
      saveEmployee();
    }
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}