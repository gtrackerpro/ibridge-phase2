import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatchService, Match } from '../../../services/match.service';
import { TrainingService } from '../../../services/training.service';
import { CsvExportService } from '../../../services/csv-export.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-match-list',
  templateUrl: './match-list.component.html',
  styleUrls: ['./match-list.component.scss']
})
export class MatchListComponent implements OnInit {
  matches: Match[] = [];
  allMatches: Match[] = [];
  loading = false;
  selectedMatch: Match | null = null;
  
  // Filters
  filters = {
    matchType: '',
    status: '',
    demandId: ''
  };

  constructor(
    public authService: AuthService,
    private matchService: MatchService,
    private trainingService: TrainingService,
    private csvExportService: CsvExportService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Check for demandId query parameter
    this.route.queryParams.subscribe(params => {
      if (params['demandId']) {
        this.filters.demandId = params['demandId'];
        this.loadMatchesForDemand(params['demandId']);
      } else {
        this.loadMatches();
      }
    });
  }

  loadMatches(): void {
    this.loading = true;
    this.matchService.getMatchResults().subscribe({
      next: (response) => {
        this.allMatches = response.matches;
        this.matches = [...this.allMatches];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading matches:', error);
        this.loading = false;
      }
    });
  }

  loadMatchesForDemand(demandId: string): void {
    this.loading = true;
    this.matchService.getMatchesForDemand(demandId).subscribe({
      next: (response) => {
        this.allMatches = response.matches;
        this.matches = [...this.allMatches];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading matches for demand:', error);
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.matches = this.allMatches.filter(match => {
      const matchTypeMatch = !this.filters.matchType || match.matchType === this.filters.matchType;
      const statusMatch = !this.filters.status || match.status === this.filters.status;
      return matchTypeMatch && statusMatch;
    });
  }

  clearFilters(): void {
    this.filters.matchType = '';
    this.filters.status = '';
    this.matches = [...this.allMatches];
  }

  getMatchCountByType(type: string): number {
    return this.matches.filter(match => match.matchType === type).length;
  }

  viewMatchDetails(match: Match): void {
    this.selectedMatch = match;
  }

  closeMatchModal(): void {
    this.selectedMatch = null;
  }

  updateMatchStatus(match: Match, status: string): void {
    const notes = status === 'Rejected' ? 
      prompt('Please provide a reason for rejection:') : 
      undefined;

    if (status === 'Rejected' && !notes) {
      return; // User cancelled
    }

    this.matchService.updateMatchStatus(match._id, status, notes || undefined).subscribe({
      next: (response) => {
        // Update the match in the local array
        const index = this.matches.findIndex(m => m._id === match._id);
        if (index !== -1) {
          this.matches[index] = response.match;
        }
        
        // Update in allMatches as well
        const allIndex = this.allMatches.findIndex(m => m._id === match._id);
        if (allIndex !== -1) {
          this.allMatches[allIndex] = response.match;
        }

        // Close modal if it's the selected match
        if (this.selectedMatch && this.selectedMatch._id === match._id) {
          this.selectedMatch = response.match;
        }
      },
      error: (error) => {
        console.error('Error updating match status:', error);
        alert('Failed to update match status');
      }
    });
  }

  createTrainingPlan(match: Match): void {
    if (confirm(`Create training plan for ${match.employeeId.name}?`)) {
      this.trainingService.generateTrainingPlanFromMatch(match._id).subscribe({
        next: (response) => {
          alert('Training plan created successfully!');
          this.router.navigate(['/training']);
        },
        error: (error) => {
          console.error('Error creating training plan:', error);
          alert('Failed to create training plan');
        }
      });
    }
  }

  exportMatches(): void {
    if (this.matches.length === 0) {
      this.notificationService.warning('No Data', 'No matches available to export');
      return;
    }

    const filename = this.csvExportService.generateFilename('matches-export');
    this.csvExportService.exportMatches(this.matches, filename);
    this.notificationService.success('Export Complete', `Exported ${this.matches.length} matches to ${filename}`);
  }
}