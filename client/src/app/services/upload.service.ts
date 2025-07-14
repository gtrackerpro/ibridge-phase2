import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FileUpload {
  _id: string;
  fileName: string;
  originalName: string;
  fileType: 'Resume' | 'CSV' | 'Document';
  mimeType: string;
  fileSize: number;
  s3Url: string;
  status: 'Uploaded' | 'Processing' | 'Processed' | 'Failed';
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  associatedEntity?: {
    entityType: 'Employee' | 'Demand' | 'Training';
    entityId: string;
  };
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadResponse {
  message: string;
  fileUpload: {
    id: string;
    fileName: string;
    fileType: string;
    uploadedAt: Date;
    s3Url?: string;
    status?: string;
    processResult?: any;
  };
}

export interface UploadHistoryResponse {
  message: string;
  uploads: FileUpload[];
  count: number;
}

export interface FileResponse {
  message: string;
  fileUpload: FileUpload & {
    downloadUrl: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  constructor(private http: HttpClient) { }

  uploadResume(file: File, employeeId?: string): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('resume', file);
    if (employeeId) {
      formData.append('employeeId', employeeId);
    }

    return this.http.post<UploadResponse>(`${environment.apiUrl}/upload/resume`, formData);
  }

  uploadCSV(file: File, type: 'employees' | 'demands'): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('csv', file);
    formData.append('type', type);

    return this.http.post<UploadResponse>(`${environment.apiUrl}/upload/csv`, formData);
  }

  getUploadHistory(): Observable<UploadHistoryResponse> {
    return this.http.get<UploadHistoryResponse>(`${environment.apiUrl}/upload/history`);
  }

  getFile(id: string): Observable<FileResponse> {
    return this.http.get<FileResponse>(`${environment.apiUrl}/upload/${id}`);
  }

  deleteFile(id: string): Observable<{ message: string; fileUpload: FileUpload }> {
    return this.http.delete<{ message: string; fileUpload: FileUpload }>(`${environment.apiUrl}/upload/${id}`);
  }
}