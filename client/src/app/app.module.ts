import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Interceptors
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

// Services
import { AuthService } from './services/auth.service';
import { EmployeeService } from './services/employee.service';
import { DemandService } from './services/demand.service';
import { MatchService } from './services/match.service';
import { TrainingService } from './services/training.service';
import { UploadService } from './services/upload.service';
import { NotificationService } from './services/notification.service';
import { ErrorHandlerService } from './services/error-handler.service';

// Components
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EmployeeListComponent } from './components/employees/employee-list/employee-list.component';
import { EmployeeFormComponent } from './components/employees/employee-form/employee-form.component';
import { DemandListComponent } from './components/demands/demand-list/demand-list.component';
import { DemandFormComponent } from './components/demands/demand-form/demand-form.component';
import { MatchListComponent } from './components/matches/match-list/match-list.component';
import { TrainingListComponent } from './components/training/training-list/training-list.component';
import { NotificationComponent } from './components/shared/notification/notification.component';
import { UserListComponent } from './components/users/user-list/user-list.component';
import { ProfileComponent } from './components/profile/profile.component';
import { EmployeeProfileComponent } from './components/employee-profile/employee-profile.component';
import { TrainingResourceListComponent } from './components/training-resources/training-resource-list/training-resource-list.component';
import { TrainingResourceFormComponent } from './components/training-resources/training-resource-form/training-resource-form.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    EmployeeListComponent,
    EmployeeFormComponent,
    DemandListComponent,
    DemandFormComponent,
    MatchListComponent,
    TrainingListComponent,
    NotificationComponent,
    UserListComponent,
    ProfileComponent,
    EmployeeProfileComponent,
    TrainingResourceListComponent,
    TrainingResourceFormComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [
    AuthGuard,
    AdminGuard,
    AuthService,
    EmployeeService,
    DemandService,
    MatchService,
    TrainingService,
    UploadService,
    NotificationService,
    ErrorHandlerService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }