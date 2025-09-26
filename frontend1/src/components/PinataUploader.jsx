// src/components/PinataUploader.jsx
import React, { useState, useRef } from "react";

/**
 * PinataUploader
 * - Uses Pinata JWT to upload files directly from the browser to Pinata's pinFileToIPFS endpoint.
 * - Supports single/multi-file upload, directory wrap option, optional client-side encryption.
 *
 * Usage:
 *   <PinataUploader />
 *
 * Environment:
 *   For Vite: set VITE_PINATA_JWT in your .env
 *   For CRA: set REACT_APP_PINATA_JWT in .env
 */

// read JWT from either Vite or CRA env var or fallback to a placeholder
const PINATA_JWT =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_PINATA_JWT) ||
  process.env.REACT_APP_PINATA_JWT ||
  "<PUT_YOUR_JWT_HERE>";

/* ---------- helper: upload using XMLHttpRequest to track progress ---------- */
function uploadFileToPinata(file, jwt, { wrapWithDirectory = false, metadata = {} } = {}, onProgress) {
  return new Promise((resolve, reject) => {
    if (!jwt || jwt.startsWith("<PUT_YOUR_JWT")) {
      reject(new Error("Pinata JWT not set. Set VITE_PINATA_JWT or REACT_APP_PINATA_JWT."));
      return;
    }

    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    // Authorization header is required
    xhr.setRequestHeader("Authorization", `Bearer ${jwt}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json); // { IpfsHash, PinSize, Timestamp }
        } catch (e) {
          resolve({ raw: xhr.responseText });
        }
      } else {
        reject(new Error(`Pinata error ${xhr.status}: ${xhr.statusText} - ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while contacting Pinata"));

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          onProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };
    }

    const formData = new FormData();
    // The 'file' field name must be "file"
    formData.append("file", file, file.name);

    // pinataMetadata (name, keyvalues)
    const pinataMetadata = {
      name: metadata.name || file.name,
      keyvalues: metadata.keyvalues || {}
    };
    formData.append("pinataMetadata", JSON.stringify(pinataMetadata));

    // pinataOptions
    const pinataOptions = {
      cidVersion: 1,
      wrapWithDirectory: !!wrapWithDirectory
    };
    formData.append("pinataOptions", JSON.stringify(pinataOptions));

    xhr.send(formData);
  });
}

/* ---------- helper: pin JSON metadata ---------- */
async function pinJSONToPinata(jsonObj, jwt, name = "metadata") {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`
    },
    body: JSON.stringify({ pinataMetadata: { name }, pinataContent: jsonObj })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Pinata JSON pin error: " + text);
  }
  return res.json(); // { IpfsHash, PinSize, Timestamp }
}

/* ---------- OPTIONAL: client-side file encryption (AES-GCM) ---------- */
async function deriveKeyFromPassword(password, salt) {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
}

async function encryptFileWithPassword(file, password) {
  // returns { blob, meta } where blob is encrypted contents and meta contains salt+iv
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // recommended 12 bytes
  const key = await deriveKeyFromPassword(password, salt);
  const data = await file.arrayBuffer();
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

  // format: [salt(16) | iv(12) | ciphertext]
  const combined = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.byteLength);
  combined.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);

  const blob = new Blob([combined], { type: "application/octet-stream" });
  const meta = { salt: Array.from(salt), iv: Array.from(iv), originalName: file.name };
  return { blob, meta };
}

/* ---------- React component ---------- */
export default function PinataUploader() {
  const [files, setFiles] = useState([]);
  const [progresses, setProgresses] = useState({}); // fileName -> percent
  const [results, setResults] = useState([]); // array of results
  const [wrapWithDirectory, setWrapWithDirectory] = useState(false);
  const [encrypt, setEncrypt] = useState(false);
  const [password, setPassword] = useState("");
  const [metadataName, setMetadataName] = useState("");
  const [keyvaluesText, setKeyvaluesText] = useState(""); // expects JSON
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef();

  async function handleUploadMultiple() {
    if (!files.length) return alert("Choose files to upload");
    setBusy(true);
    setResults([]);
    setProgresses({});

    // parse keyvalues if provided
    let keyvalues = {};
    if (keyvaluesText.trim()) {
      try {
        keyvalues = JSON.parse(keyvaluesText);
      } catch (e) {
        alert("keyvalues must be valid JSON");
        setBusy(false);
        return;
      }
    }

    const jwt = PINATA_JWT;
    const uploadResults = [];

    try {
      // If wrapWithDirectory === true, Pinata expects multiple 'file' fields in one request.
      // We implement two modes:
      // - wrapWithDirectory: send all files in one FormData request (single CID referencing a directory)
      // - normal: send files one-by-one and get separate CIDs
      if (wrapWithDirectory) {
        // create a single FormData and append all files
        const formData = new FormData();
        files.forEach((f) => formData.append("file", f, f.name));
        const pinataMetadata = {
          name: metadataName || "wrapped-dir",
          keyvalues
        };
        formData.append("pinataMetadata", JSON.stringify(pinataMetadata));
        formData.append(
          "pinataOptions",
          JSON.stringify({ cidVersion: 1, wrapWithDirectory: true })
        );

        // Send via XMLHttpRequest to support progress for big uploads
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "https://api.pinata.cloud/pinning/pinFileToIPFS");
          xhr.setRequestHeader("Authorization", `Bearer ${jwt}`);

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const percent = Math.round((ev.loaded / ev.total) * 100);
              setProgresses((p) => ({ ...p, ["__dir__"]: percent }));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText);
                uploadResults.push({ type: "directory", result: json });
                resolve();
              } catch (e) {
                uploadResults.push({ type: "directory", raw: xhr.responseText });
                resolve();
              }
            } else {
              reject(new Error(`Pinata error ${xhr.status}: ${xhr.responseText}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));

          xhr.send(formData);
        });
      } else {
        // upload files one by one (optionally encrypt first)
        for (const file of files) {
          setProgresses((p) => ({ ...p, [file.name]: 0 }));

          let fileToUpload = file;
          let encryptionMeta = null;
          if (encrypt) {
            if (!password) {
              throw new Error("Encryption enabled: provide a password");
            }
            const out = await encryptFileWithPassword(file, password);
            fileToUpload = new File([out.blob], `${file.name}.enc`, { type: "application/octet-stream" });
            encryptionMeta = out.meta;
          }

          const metadata = { name: metadataName || fileToUpload.name, keyvalues };
          const res = await uploadFileToPinata(
            fileToUpload,
            jwt,
            { wrapWithDirectory: false, metadata },
            (percent) => setProgresses((p) => ({ ...p, [file.name]: percent }))
          );

          uploadResults.push({ file: file.name, result: res, encryptionMeta });
        }
      }

      setResults(uploadResults);
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + (err.message || err));
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(e) {
    const selected = Array.from(e.target.files);
    setFiles(selected);
  }

  function reset() {
    setFiles([]);
    setProgresses({});
    setResults([]);
    setMetadataName("");
    setKeyvaluesText("");
    setEncrypt(false);
    setPassword("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div style={{ maxWidth: 820, margin: "1rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h3>Pinata Direct Upload (Browser)</h3>
      <p style={{ color: "#555" }}>
        Upload files straight to Pinata using a client JWT. <strong>For testing only.</strong>
      </p>

      <div style={{ marginBottom: 12 }}>
        <label>
          Choose file(s):
          <input
            ref={fileInputRef}
            style={{ display: "block", marginTop: 8 }}
            type="file"
            multiple
            onChange={handleFileChange}
          />
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          Upload as directory (wrapWithDirectory):
          <input
            type="checkbox"
            checked={wrapWithDirectory}
            onChange={(e) => setWrapWithDirectory(e.target.checked)}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          Pin metadata name:
          <input
            style={{ marginLeft: 8 }}
            value={metadataName}
            onChange={(e) => setMetadataName(e.target.value)}
            placeholder="optional name for this pin"
          />
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          pinataMetadata.keyvalues (JSON):
          <textarea
            value={keyvaluesText}
            onChange={(e) => setKeyvaluesText(e.target.value)}
            placeholder='{"uploader":"farmer-123"}'
            rows={3}
            style={{ display: "block", width: "100%" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          Encrypt files before upload (AES-GCM):
          <input
            type="checkbox"
            checked={encrypt}
            onChange={(e) => setEncrypt(e.target.checked)}
            style={{ marginLeft: 8 }}
          />
        </label>
        {encrypt && (
          <div style={{ marginTop: 6 }}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="encryption password (remember it to decrypt!)"
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleUploadMultiple} disabled={busy}>
          {busy ? "Uploading..." : "Upload to Pinata"}
        </button>
        <button style={{ marginLeft: 12 }} onClick={reset} disabled={busy}>
          Reset
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        {files.length > 0 && (
          <div>
            <strong>Selected files:</strong>
            <ul>
              {files.map((f) => (
                <li key={f.name}>
                  {f.name} — {Math.round(f.size / 1024)} KB
                  <div style={{ width: 400, height: 8, background: "#eee", marginTop: 6 }}>
                    <div
                      style={{
                        width: `${progresses[f.name] || 0}%`,
                        height: "100%",
                        background: "#4caf50",
                        transition: "width .2s"
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>Results:</strong>
        <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 10 }}>
          {results.length === 0 ? "No uploads yet." : JSON.stringify(results, null, 2)}
        </pre>
        {results.map((r, idx) => {
          if (r.type === "directory") {
            const cid = r.result && r.result.IpfsHash;
            return (
              <div key={idx}>
                Directory CID:{" "}
                {cid ? (
                  <a href={`https://gateway.pinata.cloud/ipfs/${cid}`} target="_blank" rel="noreferrer">
                    {cid}
                  </a>
                ) : (
                  JSON.stringify(r.result)
                )}
              </div>
            );
          }
          const cid = r.result && r.result.IpfsHash;
          return (
            <div key={idx} style={{ marginTop: 8 }}>
              <div>
                File: {r.file} — CID:{" "}
                {cid ? (
                  <a href={`https://gateway.pinata.cloud/ipfs/${cid}`} target="_blank" rel="noreferrer">
                    {cid}
                  </a>
                ) : (
                  JSON.stringify(r.result)
                )}
              </div>
              {r.encryptionMeta && (
                <div style={{ color: "#a33" }}>
                  Encrypted: keep this meta to decrypt later: {JSON.stringify(r.encryptionMeta)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
