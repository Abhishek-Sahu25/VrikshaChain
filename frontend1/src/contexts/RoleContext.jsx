// src/contexts/RoleContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import contracts from "../utiles/contracts.js";
import { ethers } from "ethers";
import AccessRegistryABI from "../abis/AccessRegistry.json"; // adjust path if needed

const RoleContext = createContext({
  account: null,
  roles: {},
  isAdmin: false,
  loading: true,
  refreshRoles: async () => {},
  setAccount: () => {},
  roleIdMap: {},
  getWritableAccessRegistry: async () => null
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

  // cached role id map (bytes32)
  const [roleIdMapState, setRoleIdMapState] = useState({});
  // cached provider
  const [cachedProvider, setCachedProvider] = useState(null);

  const readRolesForAccount = useCallback(async (acc) => {
    setLoading(true);
    const results = {};
    try {
      if (!acc) {
        console.log("[RoleProvider] No account provided, clearing roles.");
        setRoles({});
        setIsAdmin(false);
        setRoleIdMapState({});
        if (typeof window !== "undefined") window.__ROLE_DEBUG__ = { account: null, roles: {} };
        return;
      }

      console.log("[RoleProvider] fetching roles for account:", acc);

      // initialize contract instances (read-only) using contracts util
      const { provider, accessRegistry: possibleAccessRegistry } = contracts.initializeContractsReadOnly();

      // possibleAccessRegistry should be an ethers.Contract instance. If for some reason the util returned an address/string,
      // create a contract here as fallback.
      let accessRegistry = possibleAccessRegistry;
      let usedProvider = provider;
      if (!accessRegistry || typeof accessRegistry !== "object" || typeof accessRegistry.hasRole !== "function") {
        // fallback construction
        usedProvider = provider || (typeof window !== "undefined" && window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : ethers.getDefaultProvider());
        const address = contracts?.CONFIG?.ACCESS_REGISTRY_ADDRESS ?? (process.env.REACT_APP_ACCESS_REGISTRY_ADDRESS || process.env.VITE_ACCESS_REGISTRY_ADDRESS);
        accessRegistry = new ethers.Contract(address, AccessRegistryABI, usedProvider);
      }

      // cache provider for getWritableAccessRegistry
      if (usedProvider && !cachedProvider) setCachedProvider(usedProvider);

      console.log("[RoleProvider] accessRegistry loaded (contract?) :", accessRegistry && typeof accessRegistry === "object" ? "contract instance" : accessRegistry);

      // Defensive: check for hasRole method
      if (typeof accessRegistry.hasRole !== "function") {
        throw new Error("AccessRegistry contract does not expose hasRole. Check ABI/address.");
      }

      // fetch role ids (in parallel) - role id getters are typically public constants or functions
      const roleIdPromises = ROLE_KEYS.map(k => {
        if (typeof accessRegistry[k] === "function") {
          return accessRegistry[k]().catch(err => {
            console.warn(`[RoleProvider] failed to read ${k}:`, err?.message || err);
            return null;
          });
        }
        // If not exposed as a function, return null (we'll fallback to hashing the role string)
        return Promise.resolve(null);
      });

      const roleIds = await withTimeout(Promise.all(roleIdPromises), 10000);
      const roleIdMap = ROLE_KEYS.reduce((accm, key, i) => {
        accm[key] = roleIds[i];
        return accm;
      }, {});

      // Save roleIdMap to state for other components to consume
      setRoleIdMapState(roleIdMap);

      // now check hasRole for each (in parallel)
      const hasRolePromises = ROLE_KEYS.map((key) => {
        const id = roleIdMap[key];
        // if id is falsy, we will later allow fallback to hashing client-side; but here treat as not having role
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
      if (typeof window !== "undefined") window.__ROLE_DEBUG__ = { account: acc, roles: results, roleIdMap };
    } catch (err) {
      console.error("[RoleProvider] error reading roles:", err);
      // ensure we expose something sensible
      setRoles({});
      setIsAdmin(false);
      setRoleIdMapState({});
      if (typeof window !== "undefined") window.__ROLE_DEBUG__ = { account: acc, roles: {} , error: String(err) };
    } finally {
      setLoading(false);
    }
  }, [cachedProvider]);

  // public refresh function
  const refreshRoles = useCallback(async () => {
    await readRolesForAccount(account);
  }, [account, readRolesForAccount]);

  // Helper: get writable (signer-connected) AccessRegistry contract (returns null if signer not available)
  const getWritableAccessRegistry = useCallback(async () => {
    try {
      // prefer using contracts helper if available
      if (typeof contracts.initializeContractsWithSigner === "function") {
        try {
          const { accessRegistry } = await contracts.initializeContractsWithSigner();
          if (accessRegistry) return accessRegistry;
        } catch (e) {
          // fallback to manual construction below
          console.warn("[RoleProvider] initializeContractsWithSigner failed:", e?.message || e);
        }
      }

      // Try to use cached provider if present, otherwise build using window.ethereum
      let provider = cachedProvider;
      if (!provider && typeof window !== "undefined" && window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        setCachedProvider(provider);
      }
      if (!provider) {
        console.warn("[RoleProvider] No provider available for writable contract");
        return null;
      }
      const signer = provider.getSigner();
      const address = contracts?.CONFIG?.ACCESS_REGISTRY_ADDRESS ?? (process.env.REACT_APP_ACCESS_REGISTRY_ADDRESS || process.env.VITE_ACCESS_REGISTRY_ADDRESS);
      if (!address) {
        console.warn("[RoleProvider] AccessRegistry address not configured.");
        return null;
      }
      const writable = new ethers.Contract(address, AccessRegistryABI, signer);
      return writable;
    } catch (err) {
      console.warn("[RoleProvider] getWritableAccessRegistry failed:", err?.message || err);
      return null;
    }
  }, [cachedProvider]);

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

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined" && window.ethereum && handleAccountsChanged) {
        try { window.ethereum.removeListener("accountsChanged", handleAccountsChanged); } catch (e) {}
      }
    };
  }, [readRolesForAccount]);

  return (
    <RoleContext.Provider value={{
      account,
      roles,
      isAdmin,
      loading,
      refreshRoles,
      setAccount,
      roleIdMap: roleIdMapState,
      getWritableAccessRegistry
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRoles() {
  return useContext(RoleContext);
}
