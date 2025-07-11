import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Demand {
  _id: string;
  demandId: string;
  accountName: string;
  projectName: string;
  positionTitle: string;
  primarySkill: string;
  experienceRange: {
    min: number;
    max: number;
  };
  secondarySkills: string[];
  startDate: Date;
  endDate?: Date;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Fulfilled' | 'Closed';
  location?: string;
  description?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DemandResponse {
  message: string;
  demands: Demand[];
  count: number;
}

export interface SingleDemandResponse {
  message: string;
  demand: Demand;
}

@Injectable({
  providedIn: 'root'
})
export class DemandService {
  constructor(private http: HttpClient) { }

  getDemands(): Observable<DemandResponse> {
    return this.http.get<DemandResponse>(`${environment.apiUrl}/demands`);
  }

  getDemand(id: string): Observable<SingleDemandResponse> {
    return this.http.get<SingleDemandResponse>(`${environment.apiUrl}/demands/${id}`);
  }

  createDemand(demand: Partial<Demand>): Observable<SingleDemandResponse> {
    return this.http.post<SingleDemandResponse>(`${environment.apiUrl}/demands`, demand);
  }

  updateDemand(id: string, demand: Partial<Demand>): Observable<SingleDemandResponse> {
    return this.http.put<SingleDemandResponse>(`${environment.apiUrl}/demands/${id}`, demand);
  }

  deleteDemand(id: string): Observable<SingleDemandResponse> {
    return this.http.delete<SingleDemandResponse>(`${environment.apiUrl}/demands/${id}`);
  }

  getDemandsByStatus(status: string): Observable<DemandResponse> {
    return this.http.get<DemandResponse>(`${environment.apiUrl}/demands/status/${status}`);
  }
}