import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CsvExportService {

  constructor() { }

  /**
   * Convert array of objects to CSV string
   */
  convertToCSV(data: any[], headers: string[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Create header row
    const csvHeaders = headers.join(',');
    
    // Create data rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        let value = this.getNestedValue(row, header);
        
        // Handle different data types
        if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        } else if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
        }
        
        return value;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Get nested object value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  }

  /**
   * Download CSV file
   */
  downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Export matches data to CSV
   */
  exportMatches(matches: any[], filename: string = 'matches-export.csv'): void {
    const headers = [
      'demandId.demandId',
      'demandId.accountName',
      'demandId.projectName',
      'demandId.positionTitle',
      'demandId.primarySkill',
      'employeeId.employeeId',
      'employeeId.name',
      'employeeId.email',
      'employeeId.primarySkill',
      'employeeId.primarySkillExperience',
      'matchType',
      'matchScore',
      'status',
      'missingSkills',
      'createdAt'
    ];

    const processedData = matches.map(match => ({
      ...match,
      missingSkills: match.missingSkills ? match.missingSkills.join('; ') : '',
      createdAt: match.createdAt ? new Date(match.createdAt).toLocaleDateString() : ''
    }));

    const csv = this.convertToCSV(processedData, headers);
    this.downloadCSV(csv, filename);
  }

  /**
   * Export training plans to CSV
   */
  exportTrainingPlans(trainingPlans: any[], filename: string = 'training-plans-export.csv'): void {
    const headers = [
      'employeeId.employeeId',
      'employeeId.name',
      'employeeId.email',
      'skillsToTrain',
      'status',
      'progress',
      'targetCompletionDate',
      'actualCompletionDate',
      'assignedBy.name',
      'createdAt'
    ];

    const processedData = trainingPlans.map(plan => ({
      ...plan,
      skillsToTrain: plan.skillsToTrain ? plan.skillsToTrain.map((s: any) => s.skill).join('; ') : '',
      targetCompletionDate: plan.targetCompletionDate ? new Date(plan.targetCompletionDate).toLocaleDateString() : '',
      actualCompletionDate: plan.actualCompletionDate ? new Date(plan.actualCompletionDate).toLocaleDateString() : '',
      createdAt: plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : ''
    }));

    const csv = this.convertToCSV(processedData, headers);
    this.downloadCSV(csv, filename);
  }

  /**
   * Export employees to CSV
   */
  exportEmployees(employees: any[], filename: string = 'employees-export.csv'): void {
    const headers = [
      'employeeId',
      'name',
      'email',
      'status',
      'primarySkill',
      'primarySkillExperience',
      'secondarySkills',
      'BU',
      'location',
      'createdAt'
    ];

    const processedData = employees.map(employee => ({
      ...employee,
      secondarySkills: employee.secondarySkills ? 
        employee.secondarySkills.map((s: any) => `${s.skill}(${s.experience}y)`).join('; ') : '',
      createdAt: employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : ''
    }));

    const csv = this.convertToCSV(processedData, headers);
    this.downloadCSV(csv, filename);
  }

  /**
   * Export demands to CSV
   */
  exportDemands(demands: any[], filename: string = 'demands-export.csv'): void {
    const headers = [
      'demandId',
      'accountName',
      'projectName',
      'positionTitle',
      'primarySkill',
      'experienceRange.min',
      'experienceRange.max',
      'secondarySkills',
      'priority',
      'status',
      'startDate',
      'endDate',
      'location',
      'createdBy.name',
      'createdAt'
    ];

    const processedData = demands.map(demand => ({
      ...demand,
      secondarySkills: demand.secondarySkills ? demand.secondarySkills.join('; ') : '',
      startDate: demand.startDate ? new Date(demand.startDate).toLocaleDateString() : '',
      endDate: demand.endDate ? new Date(demand.endDate).toLocaleDateString() : '',
      createdAt: demand.createdAt ? new Date(demand.createdAt).toLocaleDateString() : ''
    }));

    const csv = this.convertToCSV(processedData, headers);
    this.downloadCSV(csv, filename);
  }

  /**
   * Export users to CSV
   */
  exportUsers(users: any[], filename: string = 'users-export.csv'): void {
    const headers = [
      'name',
      'email',
      'role',
      'isActive',
      'lastLogin',
      'createdAt'
    ];

    const processedData = users.map(user => ({
      ...user,
      lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never',
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
    }));

    const csv = this.convertToCSV(processedData, headers);
    this.downloadCSV(csv, filename);
  }

  /**
   * Export training resources to CSV
   */
  exportTrainingResources(resources: any[], filename: string = 'training-resources-export.csv'): void {
    const headers = [
      'title',
      'type',
      'category',
      'difficulty',
      'provider',
      'estimatedHours',
      'rating',
      'cost',
      'language',
      'associatedSkills',
      'keywords',
      'url',
      'isActive',
      'createdBy.name',
      'createdAt'
    ];

    const processedData = resources.map(resource => ({
      ...resource,
      associatedSkills: resource.associatedSkills ? resource.associatedSkills.join('; ') : '',
      keywords: resource.keywords ? resource.keywords.join('; ') : '',
      createdAt: resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : ''
    }));

    const csv = this.convertToCSV(processedData, headers);
    this.downloadCSV(csv, filename);
  }

  /**
   * Export skill gap analysis to CSV
   */
  exportSkillGaps(skillGaps: any[], filename: string = 'skill-gaps-export.csv'): void {
    const headers = [
      'skill',
      'demandCount',
      'urgency',
      'affectedDemands'
    ];

    const processedData = skillGaps.map(gap => ({
      ...gap,
      affectedDemands: gap.affectedDemands ? gap.affectedDemands.join('; ') : ''
    }));

    const csv = this.convertToCSV(processedData, headers);
    this.downloadCSV(csv, filename);
  }

  /**
   * Generate timestamp for filename
   */
  generateTimestamp(): string {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/:/g, '-');
  }

  /**
   * Generate filename with timestamp
   */
  generateFilename(baseName: string): string {
    const timestamp = this.generateTimestamp();
    return `${baseName}-${timestamp}.csv`;
  }
}