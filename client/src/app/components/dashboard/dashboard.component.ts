import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { EmployeeService, Employee } from '../../services/employee.service';
import { DemandService, Demand } from '../../services/demand.service';
import { MatchService, Match, MatchStats, SkillGap } from '../../services/match.service';
import { TrainingService, TrainingStats } from '../../services/training.service';
import { Router } from '@angular/router';
import { CsvExportService } from '../../services/csv-export.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = {
    totalEmployees: 0,
    openDemands: 0
  };
  
  matchStats: MatchStats = {
    totalMatches: 0,
    exactMatches: 0,
    nearMatches: 0,
    notEligibleMatches: 0,
    averageScore: 0,
    approvedMatches: 0,
    pendingMatches: 0,
    trainingRequiredMatches: 0
  };

  trainingStats: TrainingStats = {
    totalPlans: 0,
    draftPlans: 0,
    assignedPlans: 0,
    inProgressPlans: 0,
    completedPlans: 0,
    averageProgress: 0
  };

  recentMatches: Match[] = [];
  skillGaps: SkillGap[] = [];
  pendingApprovals: Match[] = [];
  myReportsAllocations: Match[] = [];
  myDemands: Demand[] = [];

  loading = false;

  constructor(
    public authService: AuthService,
    private employeeService: EmployeeService, // Keep this for general employee data
    private demandService: DemandService,
    private matchService: MatchService,
    private trainingService: TrainingService,
    private router: Router,
    private csvExportService: CsvExportService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load employees count (Admin and RM only)
    if (this.authService.hasRole(['Admin', 'RM'])) {
      this.employeeService.getEmployees().subscribe({
        next: (response) => {
          this.stats.totalEmployees = response.count;
        },
        error: (error) => {
          console.error('Error loading employees:', error);
        }
      });

      // Load open demands count
      this.demandService.getDemandsByStatus('Open').subscribe({
        next: (response) => {
          this.stats.openDemands = response.count;
        },
        error: (error) => {
          console.error('Error loading demands:', error);
        }
      });
    }

    // Load match statistics (Admin and RM only)
    if (this.authService.hasRole(['Admin', 'RM'])) {
      this.matchService.getMatchStats().subscribe({
        next: (response) => {
          this.matchStats = response.stats;
        },
        error: (error) => {
          console.error('Error loading match stats:', error);
        }
      });

      // Load training statistics
      this.trainingService.getTrainingStats().subscribe({
        next: (response) => {
          this.trainingStats = response.stats;
        },
        error: (error) => {
          console.error('Error loading training stats:', error);
        }
      });
    }

    // Load recent matches
    this.matchService.getMatchResults().subscribe({
      next: (response) => {
        this.recentMatches = response.matches.slice(0, 5);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading recent matches:', error);
        this.loading = false;
      }
    });

    // Load skill gaps (Admin and RM only)
    if (this.authService.hasRole(['Admin', 'RM', 'HR'])) {
      this.matchService.getSkillGaps().subscribe({
        next: (response) => {
          this.skillGaps = response.skillGaps;
        },
        error: (error) => {
          console.error('Error loading skill gaps:', error);
        }
      });
    }

    // Load Manager-specific data
    if (this.authService.isManager()) {
      this.matchService.getPendingApprovals().subscribe({
        next: (response) => {
          this.pendingApprovals = response.matches;
        },
        error: (error) => {
          console.error('Error loading pending approvals:', error);
        }
      });

      this.matchService.getMyReportsAllocations().subscribe({
        next: (response) => {
          this.myReportsAllocations = response.matches;
        },
        error: (error) => {
          console.error('Error loading my reports allocations:', error);
        }
      });
    } else if (this.authService.isRM()) {
      // RM can see their own demands
      this.demandService.getDemands().subscribe(res => this.myDemands = res.demands.filter(d => d.createdBy._id === this.authService.getCurrentUser()?.id));
    }
  }

  viewAllSkillGaps(): void {
    // Navigate to a dedicated skill gaps page or show modal
    // For now, we'll just log the action
    console.log('View all skill gaps clicked');
  }
  exportSkillGaps(): void {
    if (this.skillGaps.length === 0) {
      this.notificationService.warning('No Data', 'No skill gaps available to export');
      return;
    }

    const filename = this.csvExportService.generateFilename('skill-gaps-export');
    this.csvExportService.exportSkillGaps(this.skillGaps, filename);
    this.notificationService.success('Export Complete', `Exported ${this.skillGaps.length} skill gaps to ${filename}`);
  }

  viewMatchDetails(match: Match): void {
    // Navigate to the matches page and show the details modal
    this.router.navigate(['/matches'], { 
      queryParams: { 
        showDetails: match._id 
      } 
    });
  }

  getMatchCountByType(type: string): number {
    return this.recentMatches.filter(match => match.matchType === type).length;
  }

  getAverageMatchScore(): number {
    if (this.recentMatches.length === 0) return 0;
    const totalScore = this.recentMatches.reduce((sum, match) => sum + match.matchScore, 0);
    return Math.round(totalScore / this.recentMatches.length);
  }
}