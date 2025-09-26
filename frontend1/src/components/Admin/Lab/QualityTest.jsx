// src/components/LabTestWithPinata.jsx
import React, { useState, useRef } from "react";
import './QualityTest.css';

// Pull Pinata JWT from env
const PINATA_JWT =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_PINATA_JWT) ||
  process.env.REACT_APP_PINATA_JWT ||
  "<PUT_YOUR_JWT_HERE>";

// --- helper: upload file to Pinata ---
function uploadFileToPinata(file, jwt, { metadata = {}, wrapWithDirectory = false } = {}, onProgress) {
  return new Promise((resolve, reject) => {
    if (!jwt || jwt.startsWith("<PUT_YOUR_JWT")) {
      reject(new Error("Pinata JWT not set. Set VITE_PINATA_JWT or REACT_APP_PINATA_JWT."));
      return;
    }

    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${jwt}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json);
        } catch (e) {
          resolve({ raw: xhr.responseText });
        }
      } else {
        reject(new Error(`Pinata error ${xhr.status}: ${xhr.responseText}`));
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
    formData.append("file", file, file.name);

    const pinataMetadata = {
      name: metadata.name || file.name,
      keyvalues: metadata.keyvalues || {}
    };
    formData.append("pinataMetadata", JSON.stringify(pinataMetadata));

    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1, wrapWithDirectory }));
    xhr.send(formData);
  });
}

// --- helper: pin JSON to Pinata ---
async function pinJSONToPinata(jsonObj, jwt, name = "lab-test-metadata") {
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
  return res.json();
}

export default function LabTestWithPinata() {
  // form fields
  const [labName, setLabName] = useState("");
  const [batchId, setBatchId] = useState("");
  const [species, setSpecies] = useState("");
  const [testResults, setTestResults] = useState("");
  const [labTechnician, setLabTechnician] = useState("");
  const [testDate, setTestDate] = useState("");

  // files
  const [files, setFiles] = useState([]);
  const [wrapAsDirectory, setWrapAsDirectory] = useState(false);

  // UI state
  const [progresses, setProgresses] = useState({});
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef();

  const handleFilesChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const resetForm = () => {
    setLabName("");
    setBatchId("");
    setSpecies("");
    setTestResults("");
    setLabTechnician("");
    setTestDate("");
    setFiles([]);
    setWrapAsDirectory(false);
    setProgresses({});
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!files.length) {
      if (!window.confirm("No files selected. Continue and only store test results?")) {
        return;
      }
    }
    setBusy(true);
    setResults(null);
    setProgresses({});

    try {
      const jwt = PINATA_JWT;
      const uploadedFiles = [];

      if (wrapAsDirectory && files.length > 1) {
        // Upload directory
        const formData = new FormData();
        files.forEach((f) => formData.append("file", f, f.name));
        formData.append(
          "pinataMetadata",
          JSON.stringify({ name: `lab-test-${batchId || "unnamed"}`, keyvalues: { batchId, labName } })
        );
        formData.append("pinataOptions", JSON.stringify({ cidVersion: 1, wrapWithDirectory: true }));

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "https://api.pinata.cloud/pinning/pinFileToIPFS");
          xhr.setRequestHeader("Authorization", `Bearer ${jwt}`);

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const percent = Math.round((ev.loaded / ev.total) * 100);
              setProgresses((p) => ({ ...p, __dir__: percent }));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText);
                uploadedFiles.push({ name: "directory", ipfsResult: json });
                resolve();
              } catch (err) {
                uploadedFiles.push({ name: "directory", ipfsResult: { raw: xhr.responseText } });
                resolve();
              }
            } else {
              reject(new Error(`Pinata error ${xhr.status}: ${xhr.responseText}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error while contacting Pinata"));

          xhr.send(formData);
        });
      } else {
        // Upload files individually
        for (const file of files) {
          setProgresses((p) => ({ ...p, [file.name]: 0 }));
          const pinMetadata = { name: file.name, keyvalues: { batchId, labName } };

          const res = await uploadFileToPinata(
            file,
            jwt,
            { metadata: pinMetadata, wrapWithDirectory: false },
            (percent) => setProgresses((p) => ({ ...p, [file.name]: percent }))
          );

          uploadedFiles.push({ name: file.name, ipfsResult: res });
        }
      }

      // Build metadata JSON
      const fileEntries = uploadedFiles.map((u) => {
        const ipfs = u.ipfsResult || {};
        return {
          originalFileName: u.name,
          pinnedName: ipfs.Name || ipfs.name || u.name,
          ipfsHash: ipfs.IpfsHash || null,
          rawResult: ipfs
        };
      });

      const record = {
        recordType: "labTest",
        labName,
        batchId,
        species,
        testResults,
        labTechnician,
        testDate,
        files: fileEntries,
        createdAt: new Date().toISOString()
      };

      // Pin JSON record
      const metaPinName = `lab-test-${batchId || "unknown"}-${Date.now()}`;
      const metaRes = await pinJSONToPinata(record, jwt, metaPinName);

      const metadataCid = metaRes.IpfsHash;
      const metadataGateway = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;

      const finalResult = {
        files: uploadedFiles,
        metadataCid,
        metadataGateway,
        pinnedMetadataRaw: metaRes
      };

      setResults(finalResult);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + (err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lab-test">
      <div className="test-header">
        <h2>Lab Test Results with IPFS Storage</h2>
        <p>Record laboratory test results for herbal products with secure IPFS storage</p>
      </div>

      <div className="form-layout">
        <form onSubmit={handleSubmit} className="lab-test-form">
          <div className="form-section">
            <h3>Lab Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="labName">Laboratory Name *</label>
                <input
                  id="labName"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  required
                  disabled={busy}
                  placeholder="Enter laboratory name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="batchId">Batch ID *</label>
                <input
                  id="batchId"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  required
                  disabled={busy}
                  placeholder="Enter batch identification number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="species">Species / Herb *</label>
                <select
                  id="species"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  required
                  disabled={busy}
                >
                  <option value="">Select Herb</option>
                  <option value="ashwagandha">Ashwagandha</option>
                  <option value="tulsi">Tulsi</option>
                  <option value="turmeric">Turmeric</option>
                  <option value="neem">Neem</option>
                  <option value="amla">Amla</option>
                  <option value="brahmi">Brahmi</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="labTechnician">Lab Technician *</label>
                <input
                  id="labTechnician"
                  value={labTechnician}
                  onChange={(e) => setLabTechnician(e.target.value)}
                  required
                  disabled={busy}
                  placeholder="Enter technician name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="testDate">Test Date *</label>
                <input
                  id="testDate"
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  required
                  disabled={busy}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Test Results</h3>
            <div className="form-group">
              <label htmlFor="testResults">Test Results *</label>
              <textarea
                id="testResults"
                rows="4"
                value={testResults}
                onChange={(e) => setTestResults(e.target.value)}
                required
                placeholder="Enter detailed test results, measurements, and findings..."
                disabled={busy}
              ></textarea>
            </div>
          </div>

          <div className="form-section">
            <h3>Test Documents & Attachments</h3>
            <div className="form-group">
              <label htmlFor="files">Attach Test Reports & Documents</label>
              <input
                ref={fileInputRef}
                id="files"
                type="file"
                multiple
                onChange={handleFilesChange}
                disabled={busy}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {files.length > 0 && (
                <div className="file-list">
                  <small>Selected files: {files.map(f => f.name).join(', ')}</small>
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={wrapAsDirectory}
                  onChange={(e) => setWrapAsDirectory(e.target.checked)}
                  disabled={busy}
                />
                Upload as directory (wrapWithDirectory) - Recommended for multiple test documents
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={busy}
            >
              {busy ? '⏳ Uploading to IPFS...' : '🔬 Upload Test Results to IPFS'}
            </button>
            <button 
              type="button" 
              onClick={resetForm} 
              className="reset-btn"
              disabled={busy}
            >
              Reset Form
            </button>
          </div>
        </form>

        <div className="preview-panel">
          <div className="preview-header">
            <h3>Test Preview</h3>
          </div>
          <div className="preview-card">
            <div className="preview-item">
              <span>Laboratory:</span>
              <strong>{labName || 'Not specified'}</strong>
            </div>
            <div className="preview-item">
              <span>Batch ID:</span>
              <strong>{batchId || 'Not specified'}</strong>
            </div>
            <div className="preview-item">
              <span>Species:</span>
              <strong>{species || 'Not specified'}</strong>
            </div>
            <div className="preview-item">
              <span>Lab Technician:</span>
              <strong>{labTechnician || 'Not specified'}</strong>
            </div>
            <div className="preview-item">
              <span>Test Date:</span>
              <strong>{testDate || 'Not specified'}</strong>
            </div>
            {testResults && (
              <div className="preview-item">
                <span>Test Results:</span>
                <div className="results-preview">{testResults}</div>
              </div>
            )}
            {files.length > 0 && (
              <div className="preview-item">
                <span>Documents to upload:</span>
                <div className="files-preview">
                  {files.map((file, index) => (
                    <div key={index} className="file-preview-item">{file.name}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="progress-section">
            <h4>Upload Progress</h4>
            {Object.entries(progresses).length > 0 ? (
              <div className="progress-list">
                {Object.entries(progresses).map(([fileName, progress]) => (
                  <div key={fileName} className="progress-item">
                    <div className="progress-info">
                      <span>{fileName === '__dir__' ? 'Directory' : fileName}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-progress">No upload in progress</div>
            )}
          </div>

          {results && (
            <div className="results-section">
              <h4>IPFS Storage Results</h4>
              <div className="results-card">
                <div className="result-item success">
                  <span>✅ Metadata CID:</span>
                  <strong>
                    <a href={results.metadataGateway} target="_blank" rel="noopener noreferrer">
                      {results.metadataCid}
                    </a>
                  </strong>
                </div>
                <div className="result-item">
                  <span>IPFS Gateway Link:</span>
                  <a href={results.metadataGateway} target="_blank" rel="noopener noreferrer">
                    View on IPFS Gateway
                  </a>
                </div>
                <div className="result-item">
                  <span>Documents Uploaded:</span>
                  <div className="files-list">
                    {results.files.map((file, index) => {
                      const cid = file.ipfsResult?.IpfsHash;
                      const gateway = cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : null;
                      return (
                        <div key={index} className="file-result">
                          <span>{file.name}</span>
                          {cid ? (
                            <a href={gateway} target="_blank" rel="noopener noreferrer">
                              View Document
                            </a>
                          ) : (
                            <span className="error">Upload failed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="ipfs-info">
            <h4>IPFS Storage Benefits</h4>
            <div className="info-item">
              <span>🔒 Immutable:</span>
              <span>Test results cannot be altered</span>
            </div>
            <div className="info-item">
              <span>🌐 Permanent:</span>
              <span>Stored permanently on IPFS</span>
            </div>
            <div className="info-item">
              <span>🔗 Verifiable:</span>
              <span>Anyone can verify using the CID</span>
            </div>
            <div className="info-item">
              <span>💾 Secure:</span>
              <span>Decentralized storage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}