import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { DemandService, Demand } from '../../../services/demand.service';
import { MatchService } from '../../../services/match.service';
import { UploadService } from '../../../services/upload.service';

@Component({
  selector: 'app-demand-list',
  templateUrl: './demand-list.component.html',
  styleUrls: ['./demand-list.component.scss']
})
export class DemandListComponent implements OnInit {
  demands: Demand[] = [];
  allDemands: Demand[] = [];
  loading = false;
  selectedDemand: Demand | null = null;
  
  // Filters
  statusFilter = '';
  priorityFilter = '';

  // CSV Upload
  showUploadModal = false;
  selectedFile: File | null = null;
  uploading = false;
  uploadError = '';

  constructor(
    public authService: AuthService,
    private demandService: DemandService,
    private matchService: MatchService,
    private uploadService: UploadService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadDemands();
  }

  loadDemands(): void {
    this.loading = true;
    this.demandService.getDemands().subscribe({
      next: (response) => {
        this.allDemands = response.demands;
        this.demands = [...this.allDemands];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading demands:', error);
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.demands = this.allDemands.filter(demand => {
      const statusMatch = !this.statusFilter || demand.status === this.statusFilter;
      const priorityMatch = !this.priorityFilter || demand.priority === this.priorityFilter;
      return statusMatch && priorityMatch;
    });
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.priorityFilter = '';
    this.demands = [...this.allDemands];
  }

  viewDemand(demand: Demand): void {
    this.selectedDemand = demand;
  }

  closeDemandModal(): void {
    this.selectedDemand = null;
  }

  editDemand(demand: Demand): void {
    this.router.navigate(['/demands', demand._id, 'edit']);
  }

  canEditDemand(demand: Demand): boolean {
    if (this.authService.isAdmin()) {
      return true;
    }
    if (this.authService.isRM()) {
      return demand.createdBy._id === this.authService.getCurrentUser()?.id;
    }
    return false;
  }

  canDeleteDemand(demand: Demand): boolean {
    return this.canEditDemand(demand);
  }

  deleteDemand(demand: Demand): void {
    if (confirm(`Are you sure you want to delete demand ${demand.demandId}?`)) {
      this.demandService.deleteDemand(demand._id).subscribe({
        next: () => {
          this.loadDemands();
        },
        error: (error) => {
          console.error('Error deleting demand:', error);
          alert('Failed to delete demand');
        }
      });
    }
  }

  generateMatches(demand: Demand): void {
    if (confirm(`Generate matches for ${demand.positionTitle}?`)) {
      this.loading = true;
      this.matchService.generateMatches(demand._id).subscribe({
        next: (response) => {
          this.loading = false;
          this.closeDemandModal();
          alert(`Generated ${response.count} matches successfully!`);
          this.router.navigate(['/matches'], { 
            queryParams: { demandId: demand._id } 
          });
        },
        error: (error) => {
          this.loading = false;
          console.error('Error generating matches:', error);
          alert('Failed to generate matches');
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

    this.uploadService.uploadCSV(this.selectedFile, 'demands').subscribe({
      next: (response) => {
        this.uploading = false;
        this.closeUploadModal();
        this.loadDemands();
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