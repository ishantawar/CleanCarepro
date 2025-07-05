import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "@/contexts/NotificationContext";
import LaundryIndex from "@/pages/LaundryIndex";
import ErrorBoundary from "@/components/ErrorBoundary";
import InstallPrompt from "@/components/InstallPrompt";
import AddressSearchDemo from "@/components/AddressSearchDemo";
import { DVHostingSmsService } from "@/services/dvhostingSmsService";
import "./App.css";
import "./styles/mobile-fixes.css";

function App() {
  // Restore user session on app startup
  useEffect(() => {
    const restoreUserSession = async () => {
      try {
        const authService = DVHostingSmsService.getInstance();

        // Check if user is already authenticated locally
        const isLocallyAuthenticated = authService.isAuthenticated();

        if (isLocallyAuthenticated) {
          console.log("✅ User already authenticated locally");
          // Try to restore from backend, but don't fail if it doesn't work
          try {
            await authService.restoreSession();
          } catch (backendError) {
            console.warn(
              "Backend restore failed, but local auth is valid:",
              backendError,
            );
          }
        } else {
          console.log("ℹ️ No local authentication found");
        }
      } catch (error) {
        console.warn("Session restoration failed:", error);
        // Clear any potentially corrupted data
        localStorage.removeItem("cleancare_user");
        localStorage.removeItem("current_user");
        localStorage.removeItem("cleancare_auth_token");
      }
    };

    restoreUserSession();
  }, []);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<LaundryIndex />} />
              <Route path="/address-demo" element={<AddressSearchDemo />} />
              <Route path="*" element={<LaundryIndex />} />
            </Routes>
            <Toaster />
            <InstallPrompt />
          </div>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
