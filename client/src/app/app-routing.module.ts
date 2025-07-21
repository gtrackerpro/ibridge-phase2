import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EmployeeListComponent } from './components/employees/employee-list/employee-list.component';
import { EmployeeFormComponent } from './components/employees/employee-form/employee-form.component';
import { DemandListComponent } from './components/demands/demand-list/demand-list.component';
import { DemandFormComponent } from './components/demands/demand-form/demand-form.component';
import { MatchListComponent } from './components/matches/match-list/match-list.component';
import { TrainingListComponent } from './components/training/training-list/training-list.component';
import { UserListComponent } from './components/users/user-list/user-list.component';
import { ProfileComponent } from './components/profile/profile.component';
import { EmployeeProfileComponent } from './components/employee-profile/employee-profile.component';
import { TrainingResourceListComponent } from './components/training-resources/training-resource-list/training-resource-list.component';
import { TrainingResourceFormComponent } from './components/training-resources/training-resource-form/training-resource-form.component';
import { ManagerApprovalsComponent } from './components/manager-approvals/manager-approvals.component';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'profile', 
    component: ProfileComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'employee-profile', 
    component: EmployeeProfileComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'employees', 
    component: EmployeeListComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'employees/new', 
    component: EmployeeFormComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'employees/:id/edit', 
    component: EmployeeFormComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'demands', 
    component: DemandListComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'demands/new', 
    component: DemandFormComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'demands/:id/edit', 
    component: DemandFormComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'matches', 
    component: MatchListComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'training', 
    component: TrainingListComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'training-resources', 
    component: TrainingResourceListComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'training-resources/new', 
    component: TrainingResourceFormComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'training-resources/:id/edit', 
    component: TrainingResourceFormComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'users', 
    component: UserListComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  {
    path: 'manager-approvals',
    component: ManagerApprovalsComponent,
  },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }