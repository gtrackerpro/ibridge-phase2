import { Component, OnInit } from '@angular/core';
import { MatchService, Match } from '../../services/match.service';
import { AuthService } from '../../services/auth.service';
import { ErrorHandlerService } from '../../services/error-handler.service';

@Component({
  selector: 'app-manager-approvals',
  templateUrl: './manager-approvals.component.html',
  styleUrls: ['./manager-approvals.component.scss']
})
export class ManagerApprovalsComponent implements OnInit {
  pendingApprovals: Match[] = [];
  myReportsAllocations: Match[] = [];
  loadingPending = false;
  loadingAllocations = false;
  selectedMatch: Match | null = null;

  constructor(
    private matchService: MatchService,
    public authService: AuthService,
    private errorHandler: ErrorHandlerService
  ) { }

  ngOnInit(): void {
    this.loadPendingApprovals();
    this.loadMyReportsAllocations();
  }

  loadPendingApprovals(): void {
    this.loadingPending = true;
    this.matchService.getPendingApprovals().subscribe({
      next: (response) => {
        this.pendingApprovals = response.matches;
        this.loadingPending = false;
      },
      error: (error) => {
        console.error('Error loading pending approvals:', error);
        this.loadingPending = false;
      }
    });
  }

  loadMyReportsAllocations(): void {
    this.loadingAllocations = true;
    this.matchService.getMyReportsAllocations().subscribe({
      next: (response) => {
        this.myReportsAllocations = response.matches;
        this.loadingAllocations = false;
      },
      error: (error) => {
        console.error('Error loading my reports allocations:', error);
        this.loadingAllocations = false;
      }
    });
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
          this.loadPendingApprovals(); // Refresh list
          this.loadMyReportsAllocations(); // Refresh allocations
          this.closeMatchModal();
        },
        error: (error) => {
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
          this.loadPendingApprovals(); // Refresh list
          this.loadMyReportsAllocations(); // Refresh allocations
          this.closeMatchModal();
        },
        error: (error) => {
          console.error('Error declining match:', error);
        }
      });
    }
  }

  getMatchStatusClass(status: string): string {
    switch (status) {
      case 'Approved': return 'badge-success';
      case 'Rejected': return 'badge-danger';
      case 'Pending': return 'badge-warning';
      case 'Training Required': return 'badge-info';
      default: return 'badge-secondary';
    }
  }
}
