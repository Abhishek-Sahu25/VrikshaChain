// src/contexts/RoleContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import contracts from "../utiles/contracts.js";

const RoleContext = createContext({
  account: null,
  roles: {},
  isAdmin: false,
  loading: true,
  refreshRoles: async () => {},
  setAccount: () => {}
});

const ROLE_KEYS = [
  "DEFAULT_ADMIN_ROLE",
  "FARMER_ROLE",
  "LAB_ROLE",
  "MANUFACTURER_ROLE",
  "QA_ROLE",
  "CONSUMER_ROLE",
  "RELAYER_ROLE",
  "AGGREGATOR_ROLE"
];

// helper: run a promise with timeout
async function withTimeout(promise, ms = 10000) {
  let id;
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error("Role check timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(id);
  }
}

export function RoleProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [roles, setRoles] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const readRolesForAccount = useCallback(async (acc) => {
    setLoading(true);
    const results = {};
    try {
      if (!acc) {
        console.log("[RoleProvider] No account provided, clearing roles.");
        setRoles({});
        setIsAdmin(false);
        if (typeof window !== "undefined") window.__ROLE_DEBUG__ = { account: null, roles: {} };
        return;
      }

      console.log("[RoleProvider] fetching roles for account:", acc);

      // initialize contract instances (read-only)
      const { accessRegistry } = contracts.initializeContractsReadOnly();
      console.log("[RoleProvider] accessRegistry loaded:", accessRegistry?.target ?? accessRegistry?.address ?? "unknown");

      // fetch role ids first (in parallel)
      const roleIdPromises = ROLE_KEYS.map(k => {
        if (typeof accessRegistry[k] === "function") {
          return accessRegistry[k]().catch(err => {
            console.warn(`[RoleProvider] failed to read ${k}:`, err?.message || err);
            return null;
          });
        }
        return Promise.resolve(null);
      });

      const roleIds = await withTimeout(Promise.all(roleIdPromises), 10000);
      const roleIdMap = ROLE_KEYS.reduce((accm, key, i) => {
        accm[key] = roleIds[i];
        return accm;
      }, {});

      // now check hasRole for each (in parallel)
      const hasRolePromises = ROLE_KEYS.map((key) => {
        const id = roleIdMap[key];
        if (!id) return Promise.resolve(false);
        return accessRegistry.hasRole(id, acc).catch(err => {
          console.warn(`[RoleProvider] hasRole call failed for ${key}:`, err?.message || err);
          return false;
        });
      });

      const hasRoleResults = await withTimeout(Promise.all(hasRolePromises), 10000);

      ROLE_KEYS.forEach((key, idx) => {
        results[key] = Boolean(hasRoleResults[idx]);
      });

      setRoles(results);
      setIsAdmin(Boolean(results["DEFAULT_ADMIN_ROLE"]));
      console.log("[RoleProvider] roles resolved:", results);
      if (typeof window !== "undefined") window.__ROLE_DEBUG__ = { account: acc, roles: results };
    } catch (err) {
      console.error("[RoleProvider] error reading roles:", err);
      // ensure we expose something sensible
      setRoles({});
      setIsAdmin(false);
      if (typeof window !== "undefined") window.__ROLE_DEBUG__ = { account: acc, roles: {} , error: String(err) };
    } finally {
      setLoading(false);
    }
  }, []);

  // public refresh function
  const refreshRoles = useCallback(async () => {
    await readRolesForAccount(account);
  }, [account, readRolesForAccount]);

  // init and account change listener
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (typeof window === "undefined" || !window.ethereum) {
          console.warn("[RoleProvider] No window.ethereum available");
          if (mounted) setLoading(false);
          return;
        }
        const accounts = await window.ethereum.request({ method: "eth_accounts" }).catch(err => {
          console.warn("[RoleProvider] eth_accounts failed:", err?.message || err);
          return [];
        });
        const a = accounts && accounts.length ? accounts[0] : null;
        if (mounted) {
          setAccount(a);
          await readRolesForAccount(a);
        }
      } catch (err) {
        console.error("[RoleProvider] init error:", err);
        if (mounted) setLoading(false);
      }
    }

    init();

    function handleAccountsChanged(accounts) {
      const a = accounts && accounts.length ? accounts[0] : null;
      console.log("[RoleProvider] accountsChanged ->", a);
      setAccount(a);
      // don't await here — fire and forget
      readRolesForAccount(a).catch(err => console.error("[RoleProvider] accountsChanged read error:", err));
    }

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      mounted = false;
      if (window.ethereum && handleAccountsChanged) {
        try { window.ethereum.removeListener("accountsChanged", handleAccountsChanged); } catch (e) {}
      }
    };
  }, [readRolesForAccount]);

  return (
    <RoleContext.Provider value={{ account, roles, isAdmin, loading, refreshRoles, setAccount }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRoles() {
  return useContext(RoleContext);
}
