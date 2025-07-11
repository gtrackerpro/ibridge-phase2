import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Employee } from './employee.service';
import { Demand } from './demand.service';

export interface SkillToTrain {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  priority: 'Low' | 'Medium' | 'High';
}

export interface ResourceLink {
  title: string;
  url: string;
  type: 'Course' | 'Documentation' | 'Video' | 'Book' | 'Certification';
  estimatedHours?: number;
}

export interface TrainingPlan {
  _id: string;
  employeeId: Employee;
  demandId?: Demand;
  skillsToTrain: SkillToTrain[];
  resourceLinks: ResourceLink[];
  status: 'Draft' | 'Assigned' | 'In Progress' | 'Completed' | 'On Hold';
  startDate?: Date;
  targetCompletionDate?: Date;
  actualCompletionDate?: Date;
  progress: number;
  assignedBy: {
    _id: string;
    name: string;
    email: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingResponse {
  message: string;
  trainingPlans: TrainingPlan[];
  count: number;
}

export interface SingleTrainingResponse {
  message: string;
  trainingPlan: TrainingPlan;
}

export interface TrainingStats {
  totalPlans: number;
  draftPlans: number;
  assignedPlans: number;
  inProgressPlans: number;
  completedPlans: number;
  averageProgress: number;
}

export interface TrainingStatsResponse {
  message: string;
  stats: TrainingStats;
}

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  constructor(private http: HttpClient) { }

  getTrainingPlans(): Observable<TrainingResponse> {
    return this.http.get<TrainingResponse>(`${environment.apiUrl}/training`);
  }

  getTrainingPlan(id: string): Observable<SingleTrainingResponse> {
    return this.http.get<SingleTrainingResponse>(`${environment.apiUrl}/training/${id}`);
  }

  createTrainingPlan(trainingPlan: Partial<TrainingPlan>): Observable<SingleTrainingResponse> {
    return this.http.post<SingleTrainingResponse>(`${environment.apiUrl}/training`, trainingPlan);
  }

  updateTrainingPlan(id: string, trainingPlan: Partial<TrainingPlan>): Observable<SingleTrainingResponse> {
    return this.http.put<SingleTrainingResponse>(`${environment.apiUrl}/training/${id}`, trainingPlan);
  }

  deleteTrainingPlan(id: string): Observable<SingleTrainingResponse> {
    return this.http.delete<SingleTrainingResponse>(`${environment.apiUrl}/training/${id}`);
  }

  generateTrainingPlanFromMatch(matchId: string): Observable<SingleTrainingResponse> {
    return this.http.post<SingleTrainingResponse>(`${environment.apiUrl}/training/generate-from-match`, { matchId });
  }

  getTrainingStats(): Observable<TrainingStatsResponse> {
    return this.http.get<TrainingStatsResponse>(`${environment.apiUrl}/training/stats`);
  }
}