import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { AppShell } from "./components/layout/AppShell";
import { RequireAuth, RequireRole } from "./components/layout/RouteGuard";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import Dashboard from "./pages/dashboards/Dashboard";
import StudentsList from "./pages/students/StudentsList";
import StudentDetail from "./pages/students/StudentDetail";
import CreateStudent from "./pages/students/CreateStudent";
import LearningAreas from "./pages/academic/LearningAreas";
import ReportCards from "./pages/academic/ReportCards";
import MarksEntry from "./pages/academic/MarksEntry";
import StudentResults from "./pages/academic/StudentResults";
import FeeStructures from "./pages/fees/FeeStructures";
import Invoices from "./pages/fees/Invoices";
import Reconciliation from "./pages/fees/Reconciliation";
import PaymentsLog from "./pages/fees/PaymentsLog";
import FoodLogs from "./pages/fees/FoodLogs";
import FoodPresets from "./pages/fees/FoodPresets";
import MealTimetable from "./pages/fees/MealTimetable";
import FoodDashboard from "./pages/fees/FoodDashboard";
import StaffList from "./pages/staff/StaffList";
import CreateStaff from "./pages/staff/CreateStaff";
import StaffAttendancePage from "./pages/staff/StaffAttendance";
import ClassTeachers from "./pages/staff/ClassTeachers";
import { PayrollRuns, PayrollRunDetail } from "./pages/payroll/Payroll";
import LedgerAccounts from "./pages/ledger/LedgerAccounts";
import JournalEntry from "./pages/ledger/JournalEntry";
import TrialBalance from "./pages/ledger/TrialBalance";
import StudentAttendance from "./pages/attendance/StudentAttendance";
import LeaveNotes from "./pages/attendance/LeaveNotes";
import SmsTemplates from "./pages/sms/SmsTemplates";
import SmsCampaigns from "./pages/sms/SmsCampaigns";
import SmsLogs from "./pages/sms/SmsLogs";
import AutomatedRules from "./pages/sms/AutomatedRules";
import ParentLinks from "./pages/parents/ParentLinks";
import Users from "./pages/admin/Users";
import SystemLogs from "./pages/admin/SystemLogs";
import SchoolSettings from "./pages/SchoolSettings";
import Paybills from "./pages/settings/Paybills";
import SessionAssignments from "./pages/staff/SessionAssignments";

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />

            <Route path="students" element={<RequireRole roles={["schoolAdmin", "teacher", "accountant"]}><StudentsList /></RequireRole>} />
            <Route path="students/new" element={<RequireRole roles={["schoolAdmin"]}><CreateStudent /></RequireRole>} />
            <Route path="students/:id" element={<RequireRole roles={["schoolAdmin", "teacher", "accountant"]}><StudentDetail /></RequireRole>} />

            <Route path="academic/learning-areas" element={<RequireRole roles={["schoolAdmin", "teacher", "accountant"]}><LearningAreas /></RequireRole>} />
            <Route path="academic/marks-entry" element={<RequireRole roles={["schoolAdmin", "teacher"]}><MarksEntry /></RequireRole>} />
            <Route path="academic/results" element={<RequireRole roles={["schoolAdmin", "teacher", "accountant"]}><StudentResults /></RequireRole>} />
            <Route path="academic/report-cards" element={<RequireRole roles={["schoolAdmin", "teacher"]}><ReportCards /></RequireRole>} />

            <Route path="fees/structures" element={<RequireRole roles={["schoolAdmin", "accountant"]}><FeeStructures /></RequireRole>} />
            <Route path="fees/invoices" element={<RequireRole roles={["schoolAdmin", "accountant"]}><Invoices /></RequireRole>} />
            <Route path="fees/reconciliation" element={<RequireRole roles={["schoolAdmin", "accountant"]}><Reconciliation /></RequireRole>} />
            <Route path="fees/payments" element={<RequireRole roles={["schoolAdmin", "accountant"]}><PaymentsLog /></RequireRole>} />
            <Route path="fees/food-logs" element={<RequireRole roles={["schoolAdmin", "teacher"]}><FoodLogs /></RequireRole>} />
            <Route path="fees/food-presets" element={<RequireRole roles={["schoolAdmin"]}><FoodPresets /></RequireRole>} />
            <Route path="fees/meal-timetable" element={<RequireRole roles={["schoolAdmin", "teacher"]}><MealTimetable /></RequireRole>} />
            <Route path="fees/food-dashboard" element={<RequireRole roles={["schoolAdmin", "teacher"]}><FoodDashboard /></RequireRole>} />

            <Route path="staff" element={<RequireRole roles={["schoolAdmin", "accountant"]}><StaffList /></RequireRole>} />
            <Route path="staff/new" element={<RequireRole roles={["schoolAdmin"]}><CreateStaff /></RequireRole>} />
            <Route path="staff/attendance" element={<RequireRole roles={["schoolAdmin"]}><StaffAttendancePage /></RequireRole>} />
            <Route path="staff/class-teachers" element={<RequireRole roles={["schoolAdmin"]}><ClassTeachers /></RequireRole>} />

            <Route path="payroll" element={<RequireRole roles={["schoolAdmin", "accountant"]}><PayrollRuns /></RequireRole>} />
            <Route path="payroll/:id" element={<RequireRole roles={["schoolAdmin", "accountant"]}><PayrollRunDetail /></RequireRole>} />

            <Route path="ledger" element={<Navigate to="/ledger/trial-balance" replace />} />
            <Route path="ledger/accounts" element={<RequireRole roles={["schoolAdmin", "accountant"]}><LedgerAccounts /></RequireRole>} />
            <Route path="ledger/journal" element={<RequireRole roles={["schoolAdmin", "accountant"]}><JournalEntry /></RequireRole>} />
            <Route path="ledger/trial-balance" element={<RequireRole roles={["schoolAdmin", "accountant"]}><TrialBalance /></RequireRole>} />

            <Route path="attendance" element={<RequireRole roles={["schoolAdmin", "teacher"]}><StudentAttendance /></RequireRole>} />
            <Route path="attendance/leave-notes" element={<RequireRole roles={["schoolAdmin", "teacher"]}><LeaveNotes /></RequireRole>} />
            <Route path="staff/session-assignments" element={<RequireRole roles={["schoolAdmin"]}><SessionAssignments /></RequireRole>} />

            <Route path="sms/templates" element={<RequireRole roles={["schoolAdmin", "accountant"]}><SmsTemplates /></RequireRole>} />
            <Route path="sms/campaigns" element={<RequireRole roles={["schoolAdmin", "accountant"]}><SmsCampaigns /></RequireRole>} />
            <Route path="sms/logs" element={<RequireRole roles={["schoolAdmin", "accountant"]}><SmsLogs /></RequireRole>} />
            <Route path="sms/automated-rules" element={<RequireRole roles={["schoolAdmin"]}><AutomatedRules /></RequireRole>} />

            <Route path="parents/links" element={<RequireRole roles={["schoolAdmin"]}><ParentLinks /></RequireRole>} />
            <Route path="admin/users" element={<RequireRole roles={["schoolAdmin"]}><Users /></RequireRole>} />
            <Route path="admin/logs" element={<RequireRole roles={["schoolAdmin"]}><SystemLogs /></RequireRole>} />
            <Route path="settings" element={<RequireRole roles={["schoolAdmin"]}><SchoolSettings /></RequireRole>} />
            <Route path="settings/paybills" element={<RequireRole roles={["schoolAdmin"]}><Paybills /></RequireRole>} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
