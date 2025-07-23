import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { TrainingResourceService, TrainingResource } from '../../../services/training-resource.service';
import { ErrorHandlerService } from '../../../services/error-handler.service';

@Component({
  selector: 'app-training-resource-form',
  templateUrl: './training-resource-form.component.html',
  styleUrls: ['./training-resource-form.component.scss']
})
export class TrainingResourceFormComponent implements OnInit {
  resourceForm!: FormGroup;
  loading = false;
  error = '';
  isEditMode = false;
  resourceId: string | null = null;

  // Options for dropdowns
  types = ['Course', 'Documentation', 'Video', 'Book', 'Certification', 'Tutorial', 'Workshop'];
  difficulties = ['Beginner', 'Intermediate', 'Advanced'];
  categories = ['Programming', 'Frontend', 'Backend', 'Database', 'Cloud', 'Mobile', 'Data', 'DevOps', 'Management', 'Design'];
  costs = ['Free', 'Paid', 'Subscription'];

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private trainingResourceService: TrainingResourceService,
    private errorHandler: ErrorHandlerService
  ) { }

  ngOnInit(): void {
    this.resourceId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.resourceId;

    this.initializeForm();

    if (this.isEditMode && this.resourceId) {
      this.loadResource();
    }
  }

  initializeForm(): void {
    this.resourceForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      type: ['Course', [Validators.required]],
      provider: ['', [Validators.maxLength(100)]],
      estimatedHours: ['', [Validators.min(0), Validators.max(1000)]],
      difficulty: ['Beginner', [Validators.required]],
      associatedSkills: this.formBuilder.array([]),
      keywords: this.formBuilder.array([]),
      category: ['Programming', [Validators.required]],
      rating: [0, [Validators.min(0), Validators.max(5)]],
      cost: ['Free', [Validators.required]],
      language: ['English', [Validators.required]],
      isActive: [true]
    });
  }

  get associatedSkillsArray(): FormArray {
    return this.resourceForm.get('associatedSkills') as FormArray;
  }

  get keywordsArray(): FormArray {
    return this.resourceForm.get('keywords') as FormArray;
  }

  addAssociatedSkill(): void {
    this.associatedSkillsArray.push(this.formBuilder.control('', [Validators.required]));
  }

  removeAssociatedSkill(index: number): void {
    this.associatedSkillsArray.removeAt(index);
  }

  addKeyword(): void {
    this.keywordsArray.push(this.formBuilder.control('', [Validators.required]));
  }

  removeKeyword(index: number): void {
    this.keywordsArray.removeAt(index);
  }

  loadResource(): void {
    if (!this.resourceId) return;

    this.loading = true;
    this.trainingResourceService.getTrainingResource(this.resourceId).subscribe({
      next: (response) => {
        this.populateForm(response.resource);
        this.loading = false;
      },
      error: (error) => {
        this.error = this.errorHandler.getErrorMessage(error);
        this.loading = false;
      }
    });
  }

  populateForm(resource: TrainingResource): void {
    this.resourceForm.patchValue({
      title: resource.title,
      description: resource.description,
      url: resource.url,
      type: resource.type,
      provider: resource.provider,
      estimatedHours: resource.estimatedHours,
      difficulty: resource.difficulty,
      category: resource.category,
      rating: resource.rating,
      cost: resource.cost,
      language: resource.language,
      isActive: resource.isActive
    });

    // Populate associated skills
    const skillsArray = this.resourceForm.get('associatedSkills') as FormArray;
    skillsArray.clear();
    resource.associatedSkills.forEach(skill => {
      skillsArray.push(this.formBuilder.control(skill, [Validators.required]));
    });

    // Populate keywords
    const keywordsArray = this.resourceForm.get('keywords') as FormArray;
    keywordsArray.clear();
    resource.keywords.forEach(keyword => {
      keywordsArray.push(this.formBuilder.control(keyword, [Validators.required]));
    });
  }

  onSubmit(): void {
    if (this.resourceForm.invalid) {
      this.markFormGroupTouched(this.resourceForm);
      return;
    }

    this.loading = true;
    this.error = '';

    const formData = this.resourceForm.value;

    // Clean up arrays - remove empty values
    formData.associatedSkills = formData.associatedSkills.filter((skill: string) => skill && skill.trim());
    formData.keywords = formData.keywords.filter((keyword: string) => keyword && keyword.trim());

    if (formData.associatedSkills.length === 0) {
      this.error = 'At least one associated skill is required';
      this.loading = false;
      return;
    }

    if (this.isEditMode && this.resourceId) {
      this.trainingResourceService.updateTrainingResource(this.resourceId, formData).subscribe({
        next: (response) => {
          this.router.navigate(['/training-resources']);
        },
        error: (error) => {
          this.error = this.errorHandler.getErrorMessage(error);
          this.loading = false;
        }
      });
    } else {
      this.trainingResourceService.createTrainingResource(formData).subscribe({
        next: (response) => {
          this.router.navigate(['/training-resources']);
        },
        error: (error) => {
          this.error = this.errorHandler.getErrorMessage(error);
          this.loading = false;
        }
      });
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
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}