import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

export interface ApiError {
  message: string;
  errors?: string[];
  status?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  constructor() { }

  handleError(error: HttpErrorResponse): any {
    let apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: error.status
    };

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      apiError.message = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && typeof error.error === 'object') {
        apiError.message = error.error.message || 'Server error occurred';
        apiError.errors = error.error.errors || [];
      } else if (typeof error.error === 'string') {
        apiError.message = error.error;
      }

      // Handle specific HTTP status codes
      switch (error.status) {
        case 400:
          apiError.message = apiError.message || 'Bad Request - Please check your input';
          break;
        case 401:
          apiError.message = apiError.message || 'Unauthorized - Please login again';
          break;
        case 403:
          apiError.message = apiError.message || 'Forbidden - You do not have permission';
          break;
        case 404:
          apiError.message = apiError.message || 'Not Found - The requested resource was not found';
          break;
        case 409:
          apiError.message = apiError.message || 'Conflict - Resource already exists';
          break;
        case 422:
          apiError.message = apiError.message || 'Validation Error - Please check your input';
          break;
        case 500:
          apiError.message = apiError.message || 'Internal Server Error - Please try again later';
          break;
        case 503:
          apiError.message = apiError.message || 'Service Unavailable - Please try again later';
          break;
        default:
          apiError.message = apiError.message || `Error ${error.status}: ${error.statusText}`;
      }
    }

    console.error('API Error:', apiError);
    return throwError(() => apiError);
  }

  getErrorMessage(error: any): string {
    if (error && error.message) {
      return error.message;
    }
    if (error && error.error && error.error.message) {
      return error.error.message;
    }
    return 'An unexpected error occurred';
  }

  getErrorMessages(error: any): string[] {
    const messages: string[] = [];
    
    if (error && error.errors && Array.isArray(error.errors)) {
      messages.push(...error.errors);
    } else if (error && error.message) {
      messages.push(error.message);
    } else {
      messages.push('An unexpected error occurred');
    }
    
    return messages;
  }
}