import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontSizeProvider } from './src/context/FontSizeContext';
import { PersonnelCategoryProvider } from './src/context/PersonnelCategoryContext';
import { useAuth } from './src/hooks/useAuth';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import GuardListScreen from './src/screens/GuardListScreen';
import AddGuardScreen from './src/screens/AddGuardScreen';
import GuardDetailScreen from './src/screens/GuardDetailScreen';
import SiteListScreen from './src/screens/SiteListScreen';
import SiteDetailScreen from './src/screens/SiteDetailScreen';
import AddSiteScreen from './src/screens/AddSiteScreen';
import AssignGuardScreen from './src/screens/AssignGuardScreen';
import PayrollListScreen from './src/screens/PayrollListScreen';
import SalarySlipDetailScreen from './src/screens/SalarySlipDetailScreen';
import MoreMenuScreen from './src/screens/MoreMenuScreen';
import CandidateListScreen from './src/screens/CandidateListScreen';
import CandidateDetailScreen from './src/screens/CandidateDetailScreen';
import AddCandidateScreen from './src/screens/AddCandidateScreen';
import UniformManagementScreen from './src/screens/UniformManagementScreen';
import InspectionListScreen from './src/screens/InspectionListScreen';
import InspectionDetailScreen from './src/screens/InspectionDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationCenterScreen from './src/screens/NotificationCenterScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Guard / Personnel Screens
import GuardHomeScreen from './src/screens/GuardHomeScreen';
import PersonnelDashboardScreen from './src/screens/PersonnelDashboardScreen';
import GuardAttendanceScreen from './src/screens/GuardAttendanceScreen';
import GuardAttendanceHistoryScreen from './src/screens/GuardAttendanceHistoryScreen';
import GuardSalarySlipsScreen from './src/screens/GuardSalarySlipsScreen';
import GuardSalarySlipDetailScreen from './src/screens/GuardSalarySlipDetailScreen';
import GuardProfileScreen from './src/screens/GuardProfileScreen';
import EditGuardProfileScreen from './src/screens/EditGuardProfileScreen';
import GuardDocumentsScreen from './src/screens/GuardDocumentsScreen';

// Workforce & Facility Management Screens
import WorkforceCategoryListScreen from './src/screens/WorkforceCategoryListScreen';
import AddWorkforceCategoryScreen from './src/screens/AddWorkforceCategoryScreen';
import WorkforcePersonnelListScreen from './src/screens/WorkforcePersonnelListScreen';
import AddWorkforcePersonnelScreen from './src/screens/AddWorkforcePersonnelScreen';
import WorkforcePersonnelDetailScreen from './src/screens/WorkforcePersonnelDetailScreen';
import SiteDashboardScreen from './src/screens/SiteDashboardScreen';
import WorkforceRosterScreen from './src/screens/WorkforceRosterScreen';
import AssignPersonnelScreen from './src/screens/AssignPersonnelScreen';
import DocumentChecklistScreen from './src/screens/DocumentChecklistScreen';
import RaiseComplaintScreen from './src/screens/RaiseComplaintScreen';
import ClientComplaintListScreen from './src/screens/ClientComplaintListScreen';
import ComplaintDetailScreen from './src/screens/ComplaintDetailScreen';
import ComplaintTimelineScreen from './src/screens/ComplaintTimelineScreen';
import AttendanceCorrectionScreen from './src/screens/AttendanceCorrectionScreen';
import ClientPortalHomeScreen from './src/screens/ClientPortalHomeScreen';
import ClientWorkforceRosterScreen from './src/screens/ClientWorkforceRosterScreen';
import ClientAttendanceScreen from './src/screens/ClientAttendanceScreen';
import ClientDocumentViewScreen from './src/screens/ClientDocumentViewScreen';
import ClientPerformanceScreen from './src/screens/ClientPerformanceScreen';
import SupervisorDashboardScreen from './src/screens/SupervisorDashboardScreen';
import VacancyManagementScreen from './src/screens/VacancyManagementScreen';
import AssignReplacementScreen from './src/screens/AssignReplacementScreen';
import IncidentReportScreen from './src/screens/IncidentReportScreen';
import AnalyticsDashboardScreen from './src/screens/AnalyticsDashboardScreen';
import OperationsDashboardScreen from './src/screens/OperationsDashboardScreen';
import EscalatedComplaintsScreen from './src/screens/EscalatedComplaintsScreen';
import RoleManagementScreen from './src/screens/RoleManagementScreen';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OtpVerification: { phone: string };
  AdminDashboard: undefined;
  GuardList: undefined;
  AddGuard: undefined;
  GuardDetail: { guardId: string };
  SiteList: undefined;
  SiteDetail: {
    siteName?: string;
    clientName?: string;
    status?: 'active' | 'inactive';
    address?: string;
    contactName?: string;
    contactPhone?: string;
  };
  AddSite: undefined;
  AssignGuard: {
    siteName?: string;
    clientName?: string;
    address?: string;
  };
  PayrollList: undefined;
  SalarySlipDetail: { payrollId: string };
  MoreMenu: undefined;
  CandidateList: undefined;
  CandidateDetail: { candidateId: string };
  AddCandidate: undefined;
  UniformManagement: undefined;
  InspectionList: undefined;
  InspectionDetail: { reportId: string };
  Settings: undefined;
  NotificationCenter: undefined;
  Reports: undefined;
  Profile: undefined;
  
  // Guard / Personnel Routes
  GuardHome: undefined;
  PersonnelDashboard: undefined;
  GuardAttendance: undefined;
  GuardAttendanceHistory: undefined;
  GuardSalarySlips: undefined;
  GuardSalarySlipDetail: { payrollId: string };
  GuardProfile: undefined;
  GuardDocuments: undefined;
  EditGuardProfile: undefined;

  // Workforce & Facility Management Routes
  WorkforceCategoryList: undefined;
  AddWorkforceCategory: undefined;
  WorkforcePersonnelList: undefined;
  AddWorkforcePersonnel: undefined;
  WorkforcePersonnelDetail: { personnelId: string };
  SiteDashboard: { siteId: string };
  WorkforceRoster: { siteId: string };
  AssignPersonnel: { personnelId?: string; siteId?: string };
  DocumentChecklist: { personnelId: string };
  RaiseComplaint: { siteId?: string };
  ClientComplaintList: undefined;
  ComplaintDetail: { complaintId: string };
  ComplaintTimeline: { complaintId: string };
  AttendanceCorrection: undefined;
  ClientPortalHome: undefined;
  ClientWorkforceRoster: undefined;
  ClientAttendance: undefined;
  ClientDocumentView: { documentId: string };
  ClientPerformance: undefined;
  SupervisorDashboard: undefined;
  VacancyManagement: undefined;
  AssignReplacement: { vacancyId: string };
  IncidentReport: { siteId?: string };
  AnalyticsDashboard: undefined;
  OperationsDashboard: undefined;
  EscalatedComplaints: undefined;
  RoleManagement: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Inner component that wraps the navigation with PersonnelCategoryProvider.
 * This component has access to auth state and passes user role/id to the provider.
 */
function AppNavigator() {
  const { user } = useAuth();

  return (
    <PersonnelCategoryProvider 
      userRole={user?.role} 
      userId={user?.id}
    >
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#faf9fd' },
          }}
        >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="OtpVerification"
          component={OtpScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ animation: 'fade_from_bottom' }}
        />
        <Stack.Screen
          name="GuardList"
          component={GuardListScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="AddGuard"
          component={AddGuardScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="GuardDetail"
          component={GuardDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="SiteList"
          component={SiteListScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="SiteDetail"
          component={SiteDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AddSite"
          component={AddSiteScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="AssignGuard"
          component={AssignGuardScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="PayrollList"
          component={PayrollListScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="SalarySlipDetail"
          component={SalarySlipDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="MoreMenu"
          component={MoreMenuScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="CandidateList"
          component={CandidateListScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="CandidateDetail"
          component={CandidateDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AddCandidate"
          component={AddCandidateScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="UniformManagement"
          component={UniformManagementScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="InspectionList"
          component={InspectionListScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="InspectionDetail"
          component={InspectionDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="NotificationCenter"
          component={NotificationCenterScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="GuardHome"
          component={GuardHomeScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="PersonnelDashboard"
          component={PersonnelDashboardScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="GuardAttendance"
          component={GuardAttendanceScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="GuardAttendanceHistory"
          component={GuardAttendanceHistoryScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="GuardSalarySlips"
          component={GuardSalarySlipsScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="GuardSalarySlipDetail"
          component={GuardSalarySlipDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="GuardProfile"
          component={GuardProfileScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="GuardDocuments"
          component={GuardDocumentsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="EditGuardProfile"
          component={EditGuardProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />

        {/* Workforce & Facility Management Screens */}
        <Stack.Screen
          name="WorkforceCategoryList"
          component={WorkforceCategoryListScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AddWorkforceCategory"
          component={AddWorkforceCategoryScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="WorkforcePersonnelList"
          component={WorkforcePersonnelListScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="AddWorkforcePersonnel"
          component={AddWorkforcePersonnelScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="WorkforcePersonnelDetail"
          component={WorkforcePersonnelDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="SiteDashboard"
          component={SiteDashboardScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="WorkforceRoster"
          component={WorkforceRosterScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AssignPersonnel"
          component={AssignPersonnelScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="DocumentChecklist"
          component={DocumentChecklistScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="RaiseComplaint"
          component={RaiseComplaintScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="ClientComplaintList"
          component={ClientComplaintListScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="ComplaintDetail"
          component={ComplaintDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ComplaintTimeline"
          component={ComplaintTimelineScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AttendanceCorrection"
          component={AttendanceCorrectionScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="ClientPortalHome"
          component={ClientPortalHomeScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="ClientWorkforceRoster"
          component={ClientWorkforceRosterScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ClientAttendance"
          component={ClientAttendanceScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ClientDocumentView"
          component={ClientDocumentViewScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ClientPerformance"
          component={ClientPerformanceScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="SupervisorDashboard"
          component={SupervisorDashboardScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="VacancyManagement"
          component={VacancyManagementScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AssignReplacement"
          component={AssignReplacementScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="IncidentReport"
          component={IncidentReportScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="AnalyticsDashboard"
          component={AnalyticsDashboardScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="OperationsDashboard"
          component={OperationsDashboardScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="EscalatedComplaints"
          component={EscalatedComplaintsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="RoleManagement"
          component={RoleManagementScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
      </NavigationContainer>
    </PersonnelCategoryProvider>
  );
}

export default function App() {
  return (
    <FontSizeProvider>
      <AppNavigator />
    </FontSizeProvider>
  );
}
