import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { DemandService, Demand } from '../../../services/demand.service';

@Component({
  selector: 'app-demand-form',
  templateUrl: './demand-form.component.html',
  styleUrls: ['./demand-form.component.scss']
})
export class DemandFormComponent implements OnInit {
  demandForm!: FormGroup;
  loading = false;
  error = '';
  isEditMode = false;
  demandId: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private demandService: DemandService
  ) { }

  ngOnInit(): void {
    this.demandId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.demandId;

    this.initializeForm();

    if (this.isEditMode && this.demandId) {
      this.loadDemand();
    }
  }

  initializeForm(): void {
    this.demandForm = this.formBuilder.group({
      demandId: ['', [Validators.required]],
      accountName: ['', [Validators.required]],
      projectName: ['', [Validators.required]],
      positionTitle: ['', [Validators.required]],
      primarySkill: ['', [Validators.required]],
      minExperience: ['', [Validators.required, Validators.min(0)]],
      maxExperience: ['', [Validators.required, Validators.min(0)]],
      secondarySkills: this.formBuilder.array([]),
      startDate: ['', [Validators.required]],
      endDate: [''],
      priority: ['Medium'],
      status: ['Open'],
      location: [''],
      description: ['']
    }, {
      validators: this.experienceRangeValidator
    });
  }

  experienceRangeValidator(group: FormGroup): { [key: string]: boolean } | null {
    const minExp = group.get('minExperience')?.value;
    const maxExp = group.get('maxExperience')?.value;
    
    if (minExp !== null && maxExp !== null && minExp > maxExp) {
      return { experienceRangeInvalid: true };
    }
    
    return null;
  }

  get secondarySkillsArray(): FormArray {
    return this.demandForm.get('secondarySkills') as FormArray;
  }

  addSecondarySkill(): void {
    this.secondarySkillsArray.push(this.formBuilder.control('', [Validators.required]));
  }

  removeSecondarySkill(index: number): void {
    this.secondarySkillsArray.removeAt(index);
  }

  loadDemand(): void {
    if (!this.demandId) return;

    this.loading = true;
    this.demandService.getDemand(this.demandId).subscribe({
      next: (response) => {
        this.populateForm(response.demand);
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load demand data';
        this.loading = false;
      }
    });
  }

  populateForm(demand: Demand): void {
    // Format dates for input fields
    const startDate = new Date(demand.startDate).toISOString().split('T')[0];
    const endDate = demand.endDate ? new Date(demand.endDate).toISOString().split('T')[0] : '';

    this.demandForm.patchValue({
      demandId: demand.demandId,
      accountName: demand.accountName,
      projectName: demand.projectName,
      positionTitle: demand.positionTitle,
      primarySkill: demand.primarySkill,
      minExperience: demand.experienceRange.min,
      maxExperience: demand.experienceRange.max,
      startDate: startDate,
      endDate: endDate,
      priority: demand.priority,
      status: demand.status,
      location: demand.location,
      description: demand.description
    });

    // Populate secondary skills
    const secondarySkillsArray = this.demandForm.get('secondarySkills') as FormArray;
    secondarySkillsArray.clear();
    
    demand.secondarySkills.forEach(skill => {
      secondarySkillsArray.push(this.formBuilder.control(skill, [Validators.required]));
    });
  }

  onSubmit(): void {
    if (this.demandForm.invalid) {
      this.markFormGroupTouched(this.demandForm);
      return;
    }

    this.loading = true;
    this.error = '';

    const formData = this.demandForm.value;

    // Transform form data to match API expectations
    const demandData = {
      ...formData,
      experienceRange: {
        min: parseInt(formData.minExperience),
        max: parseInt(formData.maxExperience)
      },
      secondarySkills: formData.secondarySkills.filter((skill: string) => skill && skill.trim())
    };

    // Remove the separate min/max experience fields
    delete demandData.minExperience;
    delete demandData.maxExperience;

    if (this.isEditMode && this.demandId) {
      this.demandService.updateDemand(this.demandId, demandData).subscribe({
        next: (response) => {
          this.router.navigate(['/demands']);
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to update demand';
          this.loading = false;
        }
      });
    } else {
      this.demandService.createDemand(demandData).subscribe({
        next: (response) => {
          this.router.navigate(['/demands']);
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to create demand';
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