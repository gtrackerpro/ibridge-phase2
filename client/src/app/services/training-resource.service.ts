import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TrainingResource {
  _id: string;
  title: string;
  description?: string;
  url: string;
  type: 'Course' | 'Documentation' | 'Video' | 'Book' | 'Certification' | 'Tutorial' | 'Workshop';
  provider?: string;
  estimatedHours?: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  associatedSkills: string[];
  keywords: string[];
  category: 'Programming' | 'Frontend' | 'Backend' | 'Database' | 'Cloud' | 'Mobile' | 'Data' | 'DevOps' | 'Management' | 'Design';
  rating: number;
  cost: 'Free' | 'Paid' | 'Subscription';
  language: string;
  isActive: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  relevanceScore?: number;
  associatedSkill?: string;
}

export interface TrainingResourceResponse {
  message: string;
  resources: TrainingResource[];
  count: number;
}

export interface SingleTrainingResourceResponse {
  message: string;
  resource: TrainingResource;
}

export interface SkillGapRecommendation {
  skill: string;
  urgency: 'low' | 'medium' | 'high';
  demandCount: number;
  recommendedResources: TrainingResource[];
}

export interface SkillGapRecommendationResponse {
  message: string;
  recommendations: SkillGapRecommendation[];
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrainingResourceService {
  constructor(private http: HttpClient) { }

  getTrainingResources(filters?: {
    category?: string;
    type?: string;
    difficulty?: string;
    skill?: string;
  }): Observable<TrainingResourceResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.type) params = params.set('type', filters.type);
      if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
      if (filters.skill) params = params.set('skill', filters.skill);
    }

    return this.http.get<TrainingResourceResponse>(`${environment.apiUrl}/training-resources`, { params });
  }

  getTrainingResource(id: string): Observable<SingleTrainingResourceResponse> {
    return this.http.get<SingleTrainingResourceResponse>(`${environment.apiUrl}/training-resources/${id}`);
  }

  createTrainingResource(resource: Partial<TrainingResource>): Observable<SingleTrainingResourceResponse> {
    return this.http.post<SingleTrainingResourceResponse>(`${environment.apiUrl}/training-resources`, resource);
  }

  updateTrainingResource(id: string, resource: Partial<TrainingResource>): Observable<SingleTrainingResourceResponse> {
    return this.http.put<SingleTrainingResourceResponse>(`${environment.apiUrl}/training-resources/${id}`, resource);
  }

  deleteTrainingResource(id: string): Observable<SingleTrainingResourceResponse> {
    return this.http.delete<SingleTrainingResourceResponse>(`${environment.apiUrl}/training-resources/${id}`);
  }

  getResourcesForSkill(skill: string, targetLevel?: number): Observable<TrainingResourceResponse> {
    let params = new HttpParams();
    if (targetLevel) params = params.set('targetLevel', targetLevel.toString());

    return this.http.get<TrainingResourceResponse>(`${environment.apiUrl}/training-resources/skill/${skill}`, { params });
  }

  bulkCreateResources(resources: Partial<TrainingResource>[]): Observable<TrainingResourceResponse> {
    return this.http.post<TrainingResourceResponse>(`${environment.apiUrl}/training-resources/bulk`, { resources });
  }

  getSkillGapRecommendations(): Observable<SkillGapRecommendationResponse> {
    return this.http.get<SkillGapRecommendationResponse>(`${environment.apiUrl}/training/recommendations/skill-gaps`);
  }
}