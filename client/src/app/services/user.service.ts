import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'RM' | 'Manager' | 'Employee' | 'HR';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserResponse {
  message: string;
  users: User[];
  count: number;
}

export interface SingleUserResponse {
  message: string;
  user: User;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  rmUsers: number;
  employeeUsers: number;
  hrUsers: number;
  managerUsers: number;
}

export interface UserStatsResponse {
  message: string;
  stats: UserStats;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) { }

  getUsers(filters?: {
    search?: string;
    role?: string;
    status?: string;
  }): Observable<UserResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.role) params = params.set('role', filters.role);
      if (filters.status) params = params.set('status', filters.status);
    }

    return this.http.get<UserResponse>(`${environment.apiUrl}/users`, { params });
  }

  getUser(id: string): Observable<SingleUserResponse> {
    return this.http.get<SingleUserResponse>(`${environment.apiUrl}/users/${id}`);
  }

  createUser(user: Partial<User> & { password: string }): Observable<SingleUserResponse> {
    return this.http.post<SingleUserResponse>(`${environment.apiUrl}/users`, user);
  }

  updateUser(id: string, user: Partial<User>): Observable<SingleUserResponse> {
    return this.http.put<SingleUserResponse>(`${environment.apiUrl}/users/${id}`, user);
  }

  deleteUser(id: string): Observable<SingleUserResponse> {
    return this.http.delete<SingleUserResponse>(`${environment.apiUrl}/users/${id}`);
  }

  toggleUserStatus(id: string): Observable<SingleUserResponse> {
    return this.http.patch<SingleUserResponse>(`${environment.apiUrl}/users/${id}/toggle-status`, {});
  }

  getUserStats(): Observable<UserStatsResponse> {
    return this.http.get<UserStatsResponse>(`${environment.apiUrl}/users/stats/overview`);
  }

  getManagers(): Observable<{ message: string; managers: User[]; count: number }> {
    return this.http.get<{ message: string; managers: User[]; count: number }>(`${environment.apiUrl}/employees/managers/list`);
  }
}