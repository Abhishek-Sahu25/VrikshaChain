// src/components/WalletConnect.jsx
import React, { useState } from "react";
import { ethers } from "ethers";
import { useRoles } from "../contexts/RoleContext";
import accessRegistryAbi from "../abis/AccessRegistry.json"; // adjust path if needed
import contracts from "../utiles/contracts.js";

const ACCESS_REGISTRY_ADDRESS = contracts?.CONFIG?.ACCESS_REGISTRY_ADDRESS ?? (import.meta.env.VITE_ACCESS_REGISTRY_ADDRESS || process.env.REACT_APP_ACCESS_REGISTRY_ADDRESS);

function WalletConnect() {
  const { account, roles, refreshRoles, roleIdMap, getWritableAccessRegistry } = useRoles();

  const [roleToGrant, setRoleToGrant] = useState("FARMER_ROLE");
  const [targetAddress, setTargetAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Persist txHash and resolved Etherscan URL so link won't vanish after re-renders
  const [txHash, setTxHash] = useState(null);
  const [etherscanUrl, setEtherscanUrl] = useState(null);

  // isAddress compatibility across ethers v5/v6
  const isAddress = (ethers.utils && typeof ethers.utils.isAddress === "function")
    ? ethers.utils.isAddress
    : (ethers.isAddress ? ethers.isAddress : (a => !!a && /^0x[0-9a-fA-F]{40}$/.test(a)));

  // helper to generate etherscan tx url (tries to detect network)
  async function getEtherscanBase() {
    try {
      // prefer provider detection
      let provider = null;
      if (typeof window !== "undefined" && window.ethereum) {
        provider = (ethers.BrowserProvider && typeof ethers.BrowserProvider === "function")
          ? new ethers.BrowserProvider(window.ethereum)
          : new ethers.providers.Web3Provider(window.ethereum);
      } else {
        // fallback to contracts util provider if available
        const util = contracts;
        if (util && typeof util.getProvider === "function") {
          provider = util.getProvider();
        }
      }

      let chainId = null;
      if (provider && typeof provider.getNetwork === "function") {
        const net = await provider.getNetwork();
        chainId = net.chainId;
      } else if (typeof window !== "undefined" && window.ethereum) {
        try {
          const hex = await window.ethereum.request({ method: "eth_chainId" });
          chainId = parseInt(hex, 16);
        } catch (e) {
          // ignore
        }
      }

      const base = (cid => {
        switch (cid) {
          case 1: return "https://etherscan.io";
          case 11155111: return "https://sepolia.etherscan.io";
          case 5: return "https://goerli.etherscan.io";
          default: return "https://sepolia.etherscan.io";
        }
      })(chainId);

      return base;
    } catch (e) {
      return "https://sepolia.etherscan.io";
    }
  }

  // Build etherscan URL synchronously after tx hash is known (resolves base then sets state)
  async function buildAndSetEtherscanUrl(hash) {
    try {
      const base = await getEtherscanBase();
      const url = `${base}/tx/${hash}`;
      setEtherscanUrl(url);
      return url;
    } catch (e) {
      const fallback = `https://sepolia.etherscan.io/tx/${hash}`;
      setEtherscanUrl(fallback);
      return fallback;
    }
  }

  async function grantRole() {
    // NOTE: do not clear txHash here to keep previous link visible until user clears it
    if (!targetAddress) return alert("Enter a target address");
    if (!isAddress(targetAddress)) return alert("Enter a valid Ethereum address (0x...)");

    try {
      setLoading(true);
      setStatusMsg("Preparing transaction...");

      // Get a signer-connected contract via RoleContext helper if possible
      let accessRegistryWritable = null;
      try {
        accessRegistryWritable = await getWritableAccessRegistry();
      } catch (e) {
        console.warn("getWritableAccessRegistry failed:", e?.message || e);
      }

      // If not available from context, try to build one here (best-effort)
      if (!accessRegistryWritable) {
        if (!window.ethereum) {
          throw new Error("No injected wallet available. Connect MetaMask or similar.");
        }

        const provider = (ethers.BrowserProvider && typeof ethers.BrowserProvider === "function")
          ? new ethers.BrowserProvider(window.ethereum)
          : new ethers.providers.Web3Provider(window.ethereum);

        const signer = await provider.getSigner();
        accessRegistryWritable = new ethers.Contract(
          ACCESS_REGISTRY_ADDRESS,
          accessRegistryAbi.abi ?? accessRegistryAbi,
          signer
        );
      }

      if (!accessRegistryWritable || typeof accessRegistryWritable.grantRole !== "function") {
        console.error("accessRegistryWritable object:", accessRegistryWritable);
        throw new Error("grantRole method not found on contract. Check ABI/address.");
      }

      // Resolve roleId: prefer roleIdMap from context, fallback to calling contract constant or hashing
      let roleId = roleIdMap?.[roleToGrant] ?? null;
      if (!roleId) {
        if (typeof accessRegistryWritable[roleToGrant] === "function") {
          try {
            roleId = await accessRegistryWritable[roleToGrant]();
          } catch (e) {
            console.warn("reading role constant from contract failed:", e?.message || e);
          }
        }
      }
      if (!roleId) {
        try {
          roleId = ethers.id(roleToGrant);
        } catch (e) {
          if (ethers.utils && typeof ethers.utils.keccak256 === "function" && typeof ethers.utils.toUtf8Bytes === "function") {
            roleId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(roleToGrant));
          } else {
            throw new Error("Unable to compute roleId for " + roleToGrant);
          }
        }
      }

      setStatusMsg("Estimating gas...");

      // Try estimate gas if available
      let gasLimit = null;
      try {
        if (accessRegistryWritable.estimateGas && typeof accessRegistryWritable.estimateGas.grantRole === "function") {
          const est = await accessRegistryWritable.estimateGas.grantRole(roleId, targetAddress);
          if (est && typeof est.mul === "function") {
            gasLimit = est.mul(2);
          } else {
            gasLimit = Math.floor(Number(est) * 1.5);
          }
        } else if (accessRegistryWritable.populateTransaction && typeof accessRegistryWritable.populateTransaction.grantRole === "function") {
          const populated = await accessRegistryWritable.populateTransaction.grantRole(roleId, targetAddress);
          if (populated && populated.to && populated.data) {
            const provider = (ethers.BrowserProvider && typeof ethers.BrowserProvider === "function")
              ? new ethers.BrowserProvider(window.ethereum)
              : new ethers.providers.Web3Provider(window.ethereum);
            const estimate = await provider.estimateGas({ to: populated.to, data: populated.data });
            gasLimit = estimate && typeof estimate.mul === "function" ? estimate.mul(2) : Math.floor(Number(estimate) * 1.5);
          }
        }
      } catch (estErr) {
        console.warn("Gas estimation failed; continuing without explicit gas limit:", estErr?.message || estErr);
        gasLimit = null;
      }

      setStatusMsg("Sending transaction...");

      const txOpts = gasLimit ? { gasLimit } : {};
      const tx = await accessRegistryWritable.grantRole(roleId, targetAddress, txOpts);

      // store tx hash and pre-resolve etherscan link immediately
      if (tx && tx.hash) {
        setTxHash(tx.hash);
        await buildAndSetEtherscanUrl(tx.hash);
      }

      setStatusMsg(`Transaction sent (${tx.hash}). Waiting for confirmation...`);
      await tx.wait();
      setStatusMsg("Role granted successfully.");
      await refreshRoles();
      alert("✅ Role granted successfully");
    } catch (err) {
      console.error("grantRole err:", err);
      const msg = err?.reason || err?.message || String(err);
      alert("Failed to grant role: " + msg);
      setStatusMsg("Failed: " + msg);
    } finally {
      setLoading(false);
    }
  }

  // copy link to clipboard
  async function copyTxLink() {
    if (!etherscanUrl) return;
    try {
      await navigator.clipboard.writeText(etherscanUrl);
      alert("Etherscan link copied to clipboard");
    } catch (e) {
      console.warn("copy failed", e);
      // fallback: open in new tab
      window.open(etherscanUrl, "_blank");
    }
  }

  // clear stored tx info
  function clearTxInfo() {
    setTxHash(null);
    setEtherscanUrl(null);
  }

  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Admin — Grant Role</h3>
      <p>Connected account: <strong>{account || "Not connected"}</strong></p>

      <div style={{ marginBottom: 8 }}>
        <label>
          Role:
          <select style={{ marginLeft: 8 }} value={roleToGrant} onChange={(e) => setRoleToGrant(e.target.value)}>
            <option value="FARMER_ROLE">Farmer</option>
            <option value="LAB_ROLE">Lab</option>
            <option value="MANUFACTURER_ROLE">Manufacturer</option>
            <option value="QA_ROLE">QA</option>
            <option value="CONSUMER_ROLE">Consumer</option>
            <option value="RELAYER_ROLE">Relayer</option>
            <option value="AGGREGATOR_ROLE">Aggregator</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          Target Address:
          <input
            style={{ marginLeft: 8, width: 420 }}
            type="text"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            placeholder="0x..."
          />
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <button onClick={grantRole} disabled={loading}>
          {loading ? "Processing..." : "Grant Role"}
        </button>

        {/* Persistent Etherscan link + copy + clear */}
        {txHash && etherscanUrl && (
          <span style={{ marginLeft: 12 }}>
            <a href={etherscanUrl} target="_blank" rel="noreferrer">View on Etherscan</a>
            <button style={{ marginLeft: 8 }} onClick={copyTxLink}>Copy Link</button>
            <button style={{ marginLeft: 8 }} onClick={clearTxInfo}>Clear</button>
          </span>
        )}
      </div>

      {statusMsg && <div style={{ marginTop: 8 }}>{statusMsg}</div>}

      <details style={{ marginTop: 12 }}>
        <summary>Debug</summary>
        <pre style={{ whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
{JSON.stringify({ account, roles, roleIdMap, txHash, etherscanUrl }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default WalletConnect;
