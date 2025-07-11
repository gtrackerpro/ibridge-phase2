import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { TrainingService, TrainingPlan } from '../../../services/training.service';
import { EmployeeService, Employee } from '../../../services/employee.service';

@Component({
  selector: 'app-training-list',
  templateUrl: './training-list.component.html',
  styleUrls: ['./training-list.component.scss']
})
export class TrainingListComponent implements OnInit {
  trainingPlans: TrainingPlan[] = [];
  allTrainingPlans: TrainingPlan[] = [];
  employees: Employee[] = [];
  loading = false;
  selectedPlan: TrainingPlan | null = null;
  
  // Filters
  statusFilter = '';

  // Create modal
  showCreateModal = false;
  createForm!: FormGroup;
  creating = false;
  createError = '';

  // Progress update
  progressUpdate = 0;
  statusUpdate = '';
  progressNotes = '';
  updatingProgress = false;

  constructor(
    public authService: AuthService,
    private trainingService: TrainingService,
    private employeeService: EmployeeService,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.initializeCreateForm();
    this.loadTrainingPlans();
    this.loadEmployees();
  }

  initializeCreateForm(): void {
    this.createForm = this.formBuilder.group({
      employeeId: ['', [Validators.required]],
      skillsToTrain: this.formBuilder.array([]),
      targetCompletionDate: [''],
      notes: ['']
    });
  }

  get skillsToTrainArray(): FormArray {
    return this.createForm.get('skillsToTrain') as FormArray;
  }

  addSkillToTrain(): void {
    const skillGroup = this.formBuilder.group({
      skill: ['', [Validators.required]],
      currentLevel: [0],
      targetLevel: ['', [Validators.required, Validators.min(0)]],
      priority: ['Medium']
    });
    this.skillsToTrainArray.push(skillGroup);
  }

  removeSkillToTrain(index: number): void {
    this.skillsToTrainArray.removeAt(index);
  }

  loadTrainingPlans(): void {
    this.loading = true;
    this.trainingService.getTrainingPlans().subscribe({
      next: (response) => {
        this.allTrainingPlans = response.trainingPlans;
        this.trainingPlans = [...this.allTrainingPlans];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading training plans:', error);
        this.loading = false;
      }
    });
  }

  loadEmployees(): void {
    if (this.authService.hasRole(['Admin', 'RM'])) {
      this.employeeService.getEmployees().subscribe({
        next: (response) => {
          this.employees = response.employees;
        },
        error: (error) => {
          console.error('Error loading employees:', error);
        }
      });
    }
  }

  onFilterChange(): void {
    this.trainingPlans = this.allTrainingPlans.filter(plan => {
      return !this.statusFilter || plan.status === this.statusFilter;
    });
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.trainingPlans = [...this.allTrainingPlans];
  }

  getStatusCount(status: string): number {
    return this.trainingPlans.filter(plan => plan.status === status).length;
  }

  getAverageProgress(): number {
    if (this.trainingPlans.length === 0) return 0;
    const total = this.trainingPlans.reduce((sum, plan) => sum + plan.progress, 0);
    return Math.round(total / this.trainingPlans.length);
  }

  viewTrainingPlan(plan: TrainingPlan): void {
    this.selectedPlan = plan;
    this.progressUpdate = plan.progress;
    this.statusUpdate = plan.status;
    this.progressNotes = '';
  }

  closePlanModal(): void {
    this.selectedPlan = null;
  }

  editTrainingPlan(plan: TrainingPlan): void {
    // TODO: Implement edit functionality
    console.log('Edit training plan:', plan);
  }

  canEditPlan(plan: TrainingPlan): boolean {
    if (this.authService.isAdmin()) {
      return true;
    }
    if (this.authService.isRM()) {
      return plan.assignedBy._id === this.authService.getCurrentUser()?.id;
    }
    return false;
  }

  canUpdateProgress(plan: TrainingPlan): boolean {
    if (this.authService.isEmployee()) {
      return plan.employeeId.email === this.authService.getCurrentUser()?.email;
    }
    return this.authService.hasRole(['Admin', 'RM']);
  }

  updateProgress(): void {
    if (!this.selectedPlan) return;

    this.updatingProgress = true;

    this.trainingService.updateTrainingProgress(
      this.selectedPlan._id, 
      this.progressUpdate, 
      this.statusUpdate,
      this.progressNotes || undefined
    ).subscribe({
      next: (response) => {
        this.updatingProgress = false;
        // Update the plan in local arrays
        const index = this.trainingPlans.findIndex(p => p._id === this.selectedPlan!._id);
        if (index !== -1) {
          this.trainingPlans[index] = response.trainingPlan;
        }
        
        const allIndex = this.allTrainingPlans.findIndex(p => p._id === this.selectedPlan!._id);
        if (allIndex !== -1) {
          this.allTrainingPlans[allIndex] = response.trainingPlan;
        }

        this.selectedPlan = response.trainingPlan;
        this.notificationService.success('Success', 'Progress updated successfully!');
      },
      error: (error) => {
        this.updatingProgress = false;
        console.error('Error updating progress:', error);
        this.notificationService.error('Error', 'Failed to update progress');
      }
    });
  }

  deleteTrainingPlan(plan: TrainingPlan): void {
    if (confirm(`Are you sure you want to delete the training plan for ${plan.employeeId.name}?`)) {
      this.trainingService.deleteTrainingPlan(plan._id).subscribe({
        next: () => {
          this.loadTrainingPlans();
        },
        error: (error) => {
          console.error('Error deleting training plan:', error);
          alert('Failed to delete training plan');
        }
      });
    }
  }

  // Create modal methods
  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createForm.reset();
    this.skillsToTrainArray.clear();
    this.createError = '';
  }

  createTrainingPlan(): void {
    if (this.createForm.invalid) {
      this.markFormGroupTouched(this.createForm);
      return;
    }

    this.creating = true;
    this.createError = '';

    const formData = this.createForm.value;
    
    // Filter out empty skills
    formData.skillsToTrain = formData.skillsToTrain.filter((skill: any) => 
      skill.skill && skill.skill.trim() && skill.targetLevel !== null && skill.targetLevel !== ''
    );

    if (formData.skillsToTrain.length === 0) {
      this.createError = 'Please add at least one skill to train';
      this.creating = false;
      return;
    }

    this.trainingService.createTrainingPlan(formData).subscribe({
      next: (response) => {
        this.creating = false;
        this.closeCreateModal();
        this.loadTrainingPlans();
        alert('Training plan created successfully!');
      },
      error: (error) => {
        this.creating = false;
        this.createError = error.error?.message || 'Failed to create training plan';
      }
    });
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
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }
}