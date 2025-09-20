// src/routes/HomeRedirect.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoles } from "../contexts/RoleContext";
import ConsumerLayout from "../components/Layout/ConsumerLayout";
import Home from "../pages/Home";

/**
 * HomeRedirect:
 * - If user has a blockchain role, redirect to role-specific admin page.
 * - Otherwise show the normal Home inside the ConsumerLayout.
 *
 * Role priority: admin > manager > lab > farmer > consumer (you can change order).
 */
export default function HomeRedirect() {
  const navigate = useNavigate();
  const { roles, loading } = useRoles();

  useEffect(() => {
    if (loading) return;

    // If user has admin rights, send to admin manager (change if you prefer)
    if (roles?.DEFAULT_ADMIN_ROLE) {
      navigate("/admin/manager", { replace: true });
      return;
    }

    // manager (mapped to MANUFACTURER_ROLE in your mapping)
    if (roles?.MANUFACTURER_ROLE) {
      navigate("/admin/manager", { replace: true });
      return;
    }

    // lab
    if (roles?.LAB_ROLE) {
      navigate("/admin/lab", { replace: true });
      return;
    }

    // farmer
    if (roles?.FARMER_ROLE) {
      navigate("/admin/farmer", { replace: true });
      return;
    }

    // consumer — you could map to a consumer dashboard; for now fall through to public home
    if (roles?.CONSUMER_ROLE) {
      // example consumer landing path (change if you have one)
      // navigate("/consumer/dashboard", { replace: true });
    }

    // default: do nothing — shows public Home
  }, [roles, loading, navigate]);

  // While loading roles, show a small placeholder inside the layout (prevents flash)
  if (loading) {
    return (
      <ConsumerLayout>
        <div style={{ padding: 40 }}>Checking your blockchain roles...</div>
      </ConsumerLayout>
    );
  }

  // No role -> render public Home
  return (
    <ConsumerLayout>
      <Home />
    </ConsumerLayout>
  );
}
