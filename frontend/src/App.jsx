import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import BulkAnalyzerPage from "./pages/BulkAnalyzerPage";
import PredictionPage from "./pages/PredictionPage";
import SimulatorPage from "./pages/SimulatorPage";
import ChatbotPage from "./pages/ChatbotPage";
import NotificationsPage from "./pages/NotificationsPage";

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  const home = user?.role === "faculty" ? "/faculty" : "/student";
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={<Navigate to={user ? home : "/login"} replace />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/faculty" element={<FacultyDashboard />} />
        <Route path="/bulk-analyzer" element={<BulkAnalyzerPage />} />
        <Route path="/predict" element={<PredictionPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
    </Routes>
  );
}
