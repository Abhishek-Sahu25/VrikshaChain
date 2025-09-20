// src/components/WalletConnect.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import accessRegistryAbi from "../abis/AccessRegistry.json"; // adjust path if needed
import contracts from "../utiles/contracts"; // optional helper if you use it elsewhere

const ACCESS_REGISTRY_ADDRESS = import.meta.env.VITE_ACCESS_REGISTRY_ADDRESS;

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

export default function WalletConnect() {
  const [account, setAccount] = useState(null);
  const [roles, setRoles] = useState({});
  const [roleIds, setRoleIds] = useState({});
  const [targetAddress, setTargetAddress] = useState("");
  const [roleToGrant, setRoleToGrant] = useState("FARMER_ROLE");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // helper to connect MetaMask
  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not found — please install it.");
      return;
    }
    try {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accs?.[0] ?? null);
    } catch (err) {
      console.error("connect error", err);
      alert("Failed to connect wallet: " + (err.message || err));
    }
  }

  // disconnect (local only)
  function disconnectWallet() {
    setAccount(null);
    setRoles({});
    setRoleIds({});
  }

  // read the role identifiers (bytes32 constants) from contract
  async function fetchRoleIds() {
    if (!ACCESS_REGISTRY_ADDRESS) {
      console.warn("ACCESS_REGISTRY_ADDRESS not set in env");
      return;
    }
    try {
      const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_ALCHEMY_SEPOLIA_URL);
      const accessRegistry = new ethers.Contract(ACCESS_REGISTRY_ADDRESS, accessRegistryAbi.abi ?? accessRegistryAbi, provider);
      const ids = {};
      // fetch each role id if contract exposes it
      await Promise.all(ROLE_KEYS.map(async (k) => {
        try {
          if (typeof accessRegistry[k] === "function") {
            const id = await accessRegistry[k]();
            ids[k] = id;
          } else {
            ids[k] = null;
          }
        } catch (e) {
          console.warn("failed reading role id", k, e?.message || e);
          ids[k] = null;
        }
      }));
      setRoleIds(ids);
      return ids;
    } catch (err) {
      console.error("fetchRoleIds error", err);
      setRoleIds({});
    }
  }

  // read which roles the current account has
  async function refreshRolesForAccount(acc) {
    setLoading(true);
    setStatusMsg("Reading roles on-chain...");
    try {
      if (!acc) {
        setRoles({});
        return;
      }

      const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_ALCHEMY_SEPOLIA_URL);
      const accessRegistry = new ethers.Contract(ACCESS_REGISTRY_ADDRESS, accessRegistryAbi.abi ?? accessRegistryAbi, provider);

      // obtain role ids (roleIds state may already exist)
      const ids = Object.keys(roleIds).length ? roleIds : await fetchRoleIds();

      const checks = await Promise.all(
        ROLE_KEYS.map(async (k) => {
          const id = ids?.[k];
          if (!id) return false;
          try {
            return await accessRegistry.hasRole(id, acc);
          } catch (e) {
            console.warn("hasRole failed", k, e?.message || e);
            return false;
          }
        })
      );

      const newRoles = ROLE_KEYS.reduce((accm, key, i) => {
        accm[key] = Boolean(checks[i]);
        return accm;
      }, {});

      setRoles(newRoles);
      setStatusMsg("");
      console.log("roles for", acc, newRoles);
      return newRoles;
    } catch (err) {
      console.error("refreshRolesForAccount err", err);
      setStatusMsg("Failed reading roles: " + (err.message || err));
      setRoles({});
    } finally {
      setLoading(false);
    }
  }

  // grant role (admin operation) - uses signer (MetaMask)
  async function grantRole() {
    if (!window.ethereum) return alert("MetaMask required");
    if (!ethers.isAddress(targetAddress)) return alert("Enter a valid target Ethereum address");

    const roleId = roleIds[roleToGrant];
    if (!roleId) {
      return alert("Role id not available for " + roleToGrant + ". Make sure contract exposes the constant.");
    }

    try {
      setLoading(true);
      setStatusMsg("Preparing transaction...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const accessRegistry = new ethers.Contract(ACCESS_REGISTRY_ADDRESS, accessRegistryAbi.abi ?? accessRegistryAbi, signer);

      // estimateGas quickly to surface permission errors before sending
      try {
        await accessRegistry.estimateGas.grantRole(roleId, targetAddress);
      } catch (err) {
        // permission denied or other estimate error
        console.error("estimateGas.grantRole failed", err);
        const reason = err?.error?.message || err?.message || String(err);
        throw new Error("Estimate failed — you may not have permission. " + reason);
      }

      setStatusMsg("Sending transaction to grant role...");
      const tx = await accessRegistry.grantRole(roleId, targetAddress);
      setStatusMsg("Transaction sent — waiting for confirmation...");
      await tx.wait();
      setStatusMsg("Role granted successfully!");

      // refresh roles for the target and current account
      await fetchRoleIds();
      await refreshRolesForAccount(account);
      alert("✅ Role granted successfully");
    } catch (err) {
      console.error("grantRole err", err);
      const msg = err?.reason || err?.message || String(err);
      alert("Failed to grant role: " + msg);
      setStatusMsg("Failed: " + msg);
    } finally {
      setLoading(false);
    }
  }

  // hook: read initial account, subscribe to accounts changed
  useEffect(() => {
    async function init() {
      if (!window.ethereum) {
        console.warn("No window.ethereum");
        return;
      }
      // get accounts if already connected
      try {
        const accs = await window.ethereum.request({ method: "eth_accounts" });
        const a = accs && accs.length ? accs[0] : null;
        setAccount(a);
      } catch (e) {
        console.warn("eth_accounts failed", e);
      }

      // load roleIds so we can operate quickly later
      await fetchRoleIds();
    }

    init();

    function handleAccountsChanged(accounts) {
      const a = accounts && accounts.length ? accounts[0] : null;
      setAccount(a);
      refreshRolesForAccount(a).catch(e => console.error(e));
    }

    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      try {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        }
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // react to account changes by refreshing roles
  useEffect(() => {
    if (account) {
      refreshRolesForAccount(account);
    } else {
      setRoles({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, roleIds]);

  // small UI helper for listing role labels
  const roleLabels = {
    DEFAULT_ADMIN_ROLE: "Admin (DEFAULT_ADMIN_ROLE)",
    FARMER_ROLE: "Farmer",
    LAB_ROLE: "Lab",
    MANUFACTURER_ROLE: "Manufacturer",
    QA_ROLE: "QA",
    CONSUMER_ROLE: "Consumer",
    RELAYER_ROLE: "Relayer",
    AGGREGATOR_ROLE: "Aggregator"
  };

  // If you want to quickly prefill target with current account (for testing)
  function fillSelfAsTarget() {
    if (!account) return;
    setTargetAddress(account);
  }

  return (
    <div style={{ padding: 16, maxWidth: 920 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <strong>Account:</strong>{" "}
          {account ? (
            <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
          ) : (
            <button onClick={connectWallet}>Connect</button>
          )}
          {account && <button style={{ marginLeft: 12 }} onClick={disconnectWallet}>Disconnect</button>}
        </div>

        <div>
          {loading ? <em>{statusMsg || "Working..."}</em> : <span>{statusMsg}</span>}
        </div>
      </div>

      <hr style={{ margin: "12px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* role display */}
        <div style={{ padding: 8, border: "1px solid #e6e6e6", borderRadius: 8 }}>
          <h4>Your Roles</h4>
          <ul>
            {ROLE_KEYS.map(k => (
              <li key={k}>
                <strong>{roleLabels[k] || k}:</strong> {roles?.[k] ? <span style={{ color: "green" }}>Yes</span> : "No"}
              </li>
            ))}
          </ul>
        </div>

        {/* admin controls */}
        <div style={{ padding: 8, border: "1px solid #e6e6e6", borderRadius: 8 }}>
          <h4>Admin actions</h4>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Target address</label>
            <input
              value={targetAddress}
              onChange={e => setTargetAddress(e.target.value)}
              placeholder="0xTargetAddress"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6 }}
            />
            <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
              <button onClick={fillSelfAsTarget}>Use my address</button>
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Role to grant</label>
            <select value={roleToGrant} onChange={e => setRoleToGrant(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6 }}>
              {ROLE_KEYS.map(k => <option key={k} value={k}>{roleLabels[k] || k}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={grantRole} disabled={loading || !account}>Grant Role</button>
            <button onClick={() => refreshRolesForAccount(account)} disabled={loading}>Refresh Roles</button>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
            <div>Role IDs (fetched from contract):</div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>{JSON.stringify(roleIds, null, 2)}</pre>
          </div>

        </div>
      </div>
    </div>
  );
}
