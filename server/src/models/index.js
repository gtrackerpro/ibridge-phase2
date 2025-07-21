// Central export file for all models
const User = require('./User');
const EmployeeProfile = require('./EmployeeProfile');
const Demand = require('./Demand');
const Match = require('./Match');
const TrainingPlan = require('./TrainingPlan');
const TrainingResource = require('./TrainingResource');
const FileUpload = require('./FileUpload');
const Notification = require('./Notification');

module.exports = {
  User,
  EmployeeProfile,
  Demand,
  Match,
  TrainingPlan,
  TrainingResource,
  FileUpload,
  Notification
};