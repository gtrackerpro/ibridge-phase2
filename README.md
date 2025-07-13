# iBridge-AI: AI-Driven Resource Matching and Training Recommendation System

iBridge-AI is an intelligent platform designed to automate the matching of employees to resource demands, improve utilization, and identify training needs. This comprehensive solution integrates employee profiles, resource demands, AI-driven matching, and training recommendations into a unified system.

## 🚀 Key Features

### 👥 User Authentication & Role-Based Access Control
- **Three distinct roles**: Admin, Resource Manager (RM), and Employee
- **Secure JWT-based authentication**
- **Role-specific permissions and views**

### 👤 Employee Profile Management
- **Comprehensive skill tracking**: Primary and secondary skills with experience levels
- **Status tracking**: Available, Allocated, On Leave, Training
- **Resume uploads**: Store and manage employee resumes in AWS S3
- **Bulk import**: CSV upload for multiple employee profiles

### 📋 Demand Management
- **Resource request creation**: RMs can specify required skills, experience levels, and project details
- **Demand tracking**: Open, In Progress, Fulfilled, Closed statuses
- **Priority levels**: Low, Medium, High, Critical
- **Bulk import**: CSV upload for multiple demands

### 🧠 AI-Powered Matching Engine
- **Intelligent skill matching**: Uses NLP techniques for skill similarity
- **Experience-based scoring**: Considers years of experience in primary and secondary skills
- **Match categorization**: Exact, Near, Not Eligible
- **Comprehensive match analysis**: Detailed breakdown of matching and missing skills

### 🎓 Training Recommendation System
- **Skill gap identification**: Automatically identifies missing skills from "Near" matches
- **Curated resource mapping**: Links skill gaps to relevant learning resources
- **Training plan generation**: Creates personalized training plans
- **Progress tracking**: Monitors completion status and skill development

### 📊 Comprehensive Dashboards
- **Admin Dashboard**: Complete overview of resource pool, demands, matches, and training
- **RM Dashboard**: Focused view of demands, matches, and training recommendations
- **Employee Dashboard**: Personal profile, matches, and assigned training plans
- **Data visualization**: Key metrics and statistics for decision-making

### 📁 File Management
- **Resume uploads**: Store and manage employee resumes
- **Bulk data imports**: CSV uploads for employees and demands
- **AWS S3 integration**: Secure cloud storage for all uploaded files
- **Metadata tracking**: File history and processing status

### 📈 Reporting & Exports
- **CSV exports**: Download data tables for offline analysis
- **Exportable reports**: Matches, training plans, employees, demands, users, training resources, skill gaps
- **Custom filtering**: Filter data before export

### 🔄 Automated User Management
- **Automatic user creation**: When an Admin/RM adds an employee, a user account is automatically created
- **Default credentials**: New accounts use a standard default password
- **Self-service profile management**: Employees can update their own profiles and track training

### 📚 Training Resource Management
- **Resource library**: Curated collection of learning materials
- **Multi-format support**: Courses, Documentation, Videos, Books, Certifications
- **Skill mapping**: Resources tagged with relevant skills
- **Difficulty levels**: Beginner, Intermediate, Advanced

## 🛠️ Technology Stack

### Frontend
- **Framework**: Angular 17
- **Styling**: TailwindCSS
- **UI Components**: Angular Material
- **State Management**: RxJS

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Custom middleware

### Database
- **Database**: MongoDB Atlas
- **ODM**: Mongoose

### Cloud Storage
- **Service**: AWS S3
- **Integration**: AWS SDK

## 🏗️ Project Structure

```
iBridge-AI/
├── client/                 # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # UI components
│   │   │   ├── services/   # API services
│   │   │   ├── guards/     # Route guards
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Custom middleware
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   └── app.js          # Express application
│   └── ...
└── ...
```

## 📋 Setup and Installation

### Prerequisites
- Node.js (v14+)
- MongoDB Atlas account
- AWS S3 bucket
- npm or yarn

### Environment Setup
1. Clone the repository
2. Create a `.env` file in the server directory based on `.env.example`
3. Configure MongoDB connection string, JWT secret, and AWS credentials

### Client Setup
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm start
```

### Server Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start development server
npm run dev
```

### Full Stack Development
```bash
# From project root
npm run install:all  # Install all dependencies
npm run dev          # Start both client and server
```

## 🔐 User Roles and Access

### Admin
- Full access to all features
- User management
- System configuration
- All reports and exports

### Resource Manager (RM)
- Create and manage demands
- View and filter employee profiles
- Generate matches
- Create training plans
- Export operational reports

### Employee
- View and update own profile
- View assigned matches
- Track and update training progress
- View recommended opportunities

## 🧩 Core Modules

### Authentication Module
- Login/Register
- Password management
- Session handling

### Employee Module
- Profile management
- Skill tracking
- Status updates

### Demand Module
- Demand creation and tracking
- Priority management
- Timeline tracking

### Matching Module
- AI-based skill matching
- Match scoring and categorization
- Skill gap identification

### Training Module
- Training plan generation
- Resource recommendation
- Progress tracking

### Reporting Module
- Data visualization
- CSV exports
- Statistics and analytics

## 🔄 Workflow

1. **Admin/RM creates employee profiles** (manually or via CSV)
2. **System automatically creates user accounts** for new employees
3. **RM creates demands** for projects requiring resources
4. **AI engine generates matches** between employees and demands
5. **System identifies skill gaps** for near matches
6. **Training plans are created** for employees with skill gaps
7. **Employees complete training** and update progress
8. **Admins and RMs monitor** the entire process through dashboards

## 📊 Data Models

### User
- Authentication and authorization data
- Role information (Admin, RM, Employee)

### EmployeeProfile
- Professional details
- Skills and experience
- Availability status

### Demand
- Project requirements
- Required skills and experience
- Timeline and priority

### Match
- Links employee to demand
- Match quality score
- Missing skills identification

### TrainingPlan
- Skills to develop
- Recommended resources
- Progress tracking

### TrainingResource
- Learning material details
- Skill associations
- Difficulty and format information

### FileUpload
- Upload metadata
- S3 storage information
- Processing status

## 🔜 Future Enhancements

- **Resume parsing via NLP**: Automatic extraction of skills and experience
- **Smart training suggestions**: AI-based recommendations based on performance and career path
- **Project utilization dashboard**: Real-time tracking of resource allocation
- **Mobile application**: Native mobile experience for on-the-go access
- **Integration with learning platforms**: Direct enrollment in courses
- **Advanced analytics**: Predictive modeling for resource planning

## 📄 License

MIT