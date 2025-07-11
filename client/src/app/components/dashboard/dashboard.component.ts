import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { EmployeeService } from '../../services/employee.service';
import { DemandService } from '../../services/demand.service';
import { MatchService, Match, MatchStats, SkillGap } from '../../services/match.service';
import { TrainingService, TrainingStats } from '../../services/training.service';
import { Router } from '@angular/router';

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
  loading = false;

  constructor(
    public authService: AuthService,
    private employeeService: EmployeeService,
    private demandService: DemandService,
    private matchService: MatchService,
    private trainingService: TrainingService,
    private router: Router
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

    // Load match statistics
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
    if (this.authService.hasRole(['Admin', 'RM'])) {
      this.matchService.getSkillGaps().subscribe({
        next: (response) => {
          this.skillGaps = response.skillGaps;
        },
        error: (error) => {
          console.error('Error loading skill gaps:', error);
        }
      });
    }
  }

  viewAllSkillGaps(): void {
    // Navigate to a dedicated skill gaps page or show modal
    // For now, we'll just log the action
    console.log('View all skill gaps clicked');
  }
}