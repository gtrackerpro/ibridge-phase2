import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatchService, Match } from '../../../services/match.service';
import { TrainingService } from '../../../services/training.service';
import { CsvExportService } from '../../../services/csv-export.service';
import { NotificationService } from '../../../services/notification.service';
import { ErrorHandlerService } from '../../../services/error-handler.service';

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
    private errorHandler: ErrorHandlerService,
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

  approveMatch(match: Match): void {
    if (confirm(`Are you sure you want to approve the match for ${match.employeeId.name} on ${match.demandId.positionTitle}?`)) {
      this.matchService.approveDeclineMatch(match._id, 'Approved').subscribe({
        next: (response) => {
          this.updateMatchInLists(match._id, response.match);
          this.notificationService.success('Match Approved', `Match for ${response.match.employeeId.name} approved successfully.`);
          this.closeMatchModal();
        },
        error: (error) => {
          this.notificationService.error('Approval Failed', this.errorHandler.getErrorMessage(error));
          console.error('Error approving match:', error);
        }
      });
    }
  }

  declineMatch(match: Match): void {
    const notes = prompt('Please provide a reason for declining this match:');
    if (notes === null) { // User cancelled the prompt
      return;
    }

    if (confirm(`Are you sure you want to decline the match for ${match.employeeId.name} on ${match.demandId.positionTitle}?`)) {
      this.matchService.approveDeclineMatch(match._id, 'Rejected', notes || undefined).subscribe({
        next: (response) => {
          this.updateMatchInLists(match._id, response.match);
          this.notificationService.success('Match Declined', `Match for ${response.match.employeeId.name} declined successfully.`);
          this.closeMatchModal();
        },
        error: (error) => {
          this.notificationService.error('Decline Failed', this.errorHandler.getErrorMessage(error));
          console.error('Error declining match:', error);
        }
      });
    }
  }

  // This method is for RMs to update the status after approval workflow (if needed)
  // Or for Admins to directly change status
  updateMatchStatus(match: Match, status: string, notes?: string): void {
    if (confirm(`Are you sure you want to change the status of this match to ${status}?`)) {
      this.matchService.updateMatchStatus(match._id, status, notes).subscribe({
        next: (response) => {
          this.updateMatchInLists(match._id, response.match);
          this.notificationService.success('Status Updated', `Match status updated to ${status}.`);
          this.closeMatchModal();
        },
        error: (error) => {
          this.notificationService.error('Status Update Failed', this.errorHandler.getErrorMessage(error));
          console.error('Error updating match status:', error);
        }
      });
    }
  }

  private updateMatchInLists(matchId: string, updatedMatch: Match): void {
    const index = this.matches.findIndex(m => m._id === matchId);
    if (index !== -1) {
      this.matches[index] = updatedMatch;
    }
    const allIndex = this.allMatches.findIndex(m => m._id === matchId);
    if (allIndex !== -1) {
      this.allMatches[allIndex] = updatedMatch;
    }

    // Close modal if it's the selected match
    if (this.selectedMatch && this.selectedMatch._id === matchId) {
      this.selectedMatch = updatedMatch;
    }
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