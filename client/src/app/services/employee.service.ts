import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SecondarySkill {
  skill: string;
  experience: number;
}

export interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  status: 'Available' | 'Allocated' | 'On Leave' | 'Training';
  primarySkill: string;
  primarySkillExperience: number;
  secondarySkills: SecondarySkill[];
  BU: string;
  resumeUrl?: string;
  location?: string;
  availability?: {
    startDate?: Date;
    endDate?: Date;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  managerUser?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeResponse {
  message: string;
  employees: Employee[];
  count: number;
}

export interface SingleEmployeeResponse {
  message: string;
  employee: Employee;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  constructor(private http: HttpClient) { }

  getEmployees(): Observable<EmployeeResponse> {
    return this.http.get<EmployeeResponse>(`${environment.apiUrl}/employees`);
  }

  getEmployee(id: string): Observable<SingleEmployeeResponse> {
    return this.http.get<SingleEmployeeResponse>(`${environment.apiUrl}/employees/${id}`);
  }

  createEmployee(employee: Partial<Employee>): Observable<SingleEmployeeResponse> {
    return this.http.post<SingleEmployeeResponse>(`${environment.apiUrl}/employees`, employee);
  }

  updateEmployee(id: string, employee: Partial<Employee>): Observable<SingleEmployeeResponse> {
    return this.http.put<SingleEmployeeResponse>(`${environment.apiUrl}/employees/${id}`, employee);
  }

  deleteEmployee(id: string): Observable<SingleEmployeeResponse> {
    return this.http.delete<SingleEmployeeResponse>(`${environment.apiUrl}/employees/${id}`);
  }

  searchEmployees(skill?: string, minExperience?: number, status?: string): Observable<EmployeeResponse> {
    let params = new HttpParams();
    
    if (skill) {
      params = params.set('skill', skill);
    }
    if (minExperience !== undefined) {
      params = params.set('minExperience', minExperience.toString());
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<EmployeeResponse>(`${environment.apiUrl}/employees/search/skills`, { params });
  }
}