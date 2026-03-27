import { Routes, Route } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
      </Route>
    </Routes>
  );
}
