import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Employee } from './employee.service';
import { Demand } from './demand.service';

export interface SkillMatch {
  skill: string;
  required: boolean;
  employeeExperience: number;
  requiredExperience: number;
}

export interface Match {
  _id: string;
  demandId: Demand;
  employeeId: Employee;
  matchType: 'Exact' | 'Near' | 'Not Eligible';
  matchScore: number;
  missingSkills: string[];
  skillsMatched: SkillMatch[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Training Required';
  notes?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchResponse {
  message: string;
  matches: Match[];
  count: number;
}

export interface MatchStats {
  totalMatches: number;
  exactMatches: number;
  nearMatches: number;
  notEligibleMatches: number;
  averageScore: number;
  approvedMatches: number;
  pendingMatches: number;
  trainingRequiredMatches: number;
}

export interface MatchStatsResponse {
  message: string;
  stats: MatchStats;
}

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  constructor(private http: HttpClient) { }

  generateMatches(demandId: string): Observable<MatchResponse> {
    return this.http.post<MatchResponse>(`${environment.apiUrl}/match/generate`, { demandId });
  }

  getMatchResults(): Observable<MatchResponse> {
    return this.http.get<MatchResponse>(`${environment.apiUrl}/match/results`);
  }

  getMatchesForDemand(demandId: string): Observable<MatchResponse> {
    return this.http.get<MatchResponse>(`${environment.apiUrl}/match/demand/${demandId}`);
  }

  getMatchesForEmployee(employeeId: string): Observable<MatchResponse> {
    return this.http.get<MatchResponse>(`${environment.apiUrl}/match/employee/${employeeId}`);
  }

  updateMatchStatus(matchId: string, status: string, notes?: string): Observable<{ message: string; match: Match }> {
    return this.http.put<{ message: string; match: Match }>(`${environment.apiUrl}/match/${matchId}/status`, { 
      status, 
      notes 
    });
  }

  getMatchStats(): Observable<MatchStatsResponse> {
    return this.http.get<MatchStatsResponse>(`${environment.apiUrl}/match/stats`);
  }
}