import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { TrainingResourceService, TrainingResource } from '../../../services/training-resource.service';
import { ErrorHandlerService } from '../../../services/error-handler.service';
import { CsvExportService } from '../../../services/csv-export.service';

@Component({
  selector: 'app-training-resource-list',
  templateUrl: './training-resource-list.component.html',
  styleUrls: ['./training-resource-list.component.scss']
})
export class TrainingResourceListComponent implements OnInit {
  resources: TrainingResource[] = [];
  allResources: TrainingResource[] = [];
  loading = false;
  selectedResource: TrainingResource | null = null;
  
  // Filters
  filters = {
    category: '',
    type: '',
    difficulty: '',
    skill: '',
    cost: ''
  };

  // Categories and types for filtering
  categories = ['Programming', 'Frontend', 'Backend', 'Database', 'Cloud', 'Mobile', 'Data', 'DevOps', 'Management', 'Design'];
  types = ['Course', 'Documentation', 'Video', 'Book', 'Certification', 'Tutorial', 'Workshop'];
  difficulties = ['Beginner', 'Intermediate', 'Advanced'];
  costs = ['Free', 'Paid', 'Subscription'];

  constructor(
    public authService: AuthService,
    private trainingResourceService: TrainingResourceService,
    private errorHandler: ErrorHandlerService,
    private router: Router,
    private csvExportService: CsvExportService
  ) { }

  ngOnInit(): void {
    this.loadResources();
  }

  loadResources(): void {
    this.loading = true;
    
    this.trainingResourceService.getTrainingResources(this.filters).subscribe({
      next: (response) => {
        this.allResources = response.resources;
        this.resources = [...this.allResources];
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading resources:', error);
      }
    });
  }

  onFilterChange(): void {
    this.loadResources();
  }

  clearFilters(): void {
    this.filters = {
      category: '',
      type: '',
      difficulty: '',
      skill: '',
      cost: ''
    };
    this.loadResources();
  }

  getResourceCountByCategory(category: string): number {
    return this.resources.filter(resource => resource.category === category).length;
  }

  getResourceCountByType(type: string): number {
    return this.resources.filter(resource => resource.type === type).length;
  }

  viewResource(resource: TrainingResource): void {
    this.selectedResource = resource;
  }

  closeResourceModal(): void {
    this.selectedResource = null;
  }

  editResource(resource: TrainingResource): void {
    this.router.navigate(['/training-resources', resource._id, 'edit']);
  }

  canEditResource(resource: TrainingResource): boolean {
    // Only Admin can edit training resources
    return this.authService.isAdmin();
  }

  deleteResource(resource: TrainingResource): void {
    if (confirm(`Are you sure you want to delete "${resource.title}"?`)) {
      this.trainingResourceService.deleteTrainingResource(resource._id).subscribe({
        next: () => {
          this.loadResources();
        },
        error: (error) => {
          console.error('Error deleting resource:', error);
        }
      });
    }
  }

  openResourceUrl(url: string): void {
    window.open(url, '_blank');
  }

  getRatingStars(rating: number): string[] {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push('full');
      } else if (i - 0.5 <= rating) {
        stars.push('half');
      } else {
        stars.push('empty');
      }
    }
    return stars;
  }
  exportResources(): void {
    if (this.resources.length === 0) {
      return;
    }

    const filename = this.csvExportService.generateFilename('training-resources-export');
    this.csvExportService.exportTrainingResources(this.resources, filename);
  }
}