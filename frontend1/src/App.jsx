// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Web3Provider } from "./contexts/Web3Context";
import { AppProvider } from "./contexts/AppContext";
import { RoleProvider, useRoles } from "./contexts/RoleContext"; // useRoles hook
import AppRoutes from "./AppRoutes";
import PinataUploader from "./components/PinataUploader";
import "./App.css";

/**
 * RoleBasedUploader
 * - Shows the uploader button & modal only for FARMER_ROLE
 */
function RoleBasedUploader() {
  const { roles, loading } = useRoles();
  const [uploaderOpen, setUploaderOpen] = useState(false);

  if (loading) return null;

  const allowed = Boolean(roles && roles.FARMER_ROLE);
  if (!allowed) return null;

  return (
    <>
      {/* Floating button to open uploader */}
      <button
        onClick={() => setUploaderOpen(true)}
        title="Open Pinata Uploader"
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 2000,
          background: "#0b74ff",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "10px 14px",
          boxShadow: "0 6px 18px rgba(11,116,255,0.18)",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Upload to Pinata
      </button>

      {/* Modal overlay */}
      {uploaderOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setUploaderOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1100px, 96%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 12,
              padding: 18,
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Pinata Direct Upload</h3>
              <button
                onClick={() => setUploaderOpen(false)}
                style={{
                  marginLeft: 12,
                  background: "transparent",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                }}
                aria-label="Close uploader"
              >
                ✕
              </button>
            </div>

            <PinataUploader />
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <AppProvider>
          <RoleProvider>
            <Router>
              <div className="App" style={{ minHeight: "100vh", position: "relative" }}>
                <AppRoutes />
              </div>
            </Router>
          </RoleProvider>
        </AppProvider>
      </AuthProvider>
    </Web3Provider>
  );
}

export default App;