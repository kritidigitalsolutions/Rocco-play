import { Routes, Route } from "react-router-dom";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layout/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";



function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={<AdminLogin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;