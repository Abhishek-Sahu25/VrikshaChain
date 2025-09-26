// src/components/CollectionEventWithPinata.jsx
import React, { useState, useRef } from "react";
import './CollectionEvent.css';

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
async function pinJSONToPinata(jsonObj, jwt, name = "collection-metadata") {
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

export default function CollectionEventWithPinata() {
  // form fields
  const [farmerName, setFarmerName] = useState("");
  const [species, setSpecies] = useState("");
  const [weight, setWeight] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [qualityNotes, setQualityNotes] = useState("");
  const [isLocationAutoFilled, setIsLocationAutoFilled] = useState(false);

  // files
  const [files, setFiles] = useState([]);
  const [wrapAsDirectory, setWrapAsDirectory] = useState(false);

  // UI state
  const [progresses, setProgresses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef();

  const handleFilesChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const resetForm = () => {
    setFarmerName("");
    setSpecies("");
    setWeight("");
    setHarvestDate("");
    setLatitude("");
    setLongitude("");
    setQualityNotes("");
    setIsLocationAutoFilled(false);
    setFiles([]);
    setWrapAsDirectory(false);
    setProgresses({});
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setLatitude(lat);
          setLongitude(lng);
          setIsLocationAutoFilled(true);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not retrieve your location. Please try again.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleLocationChange = (e) => {
    // Prevent manual changes to location fields
    e.preventDefault();
    return false;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Basic validation
    if (!farmerName || !species || !weight || !harvestDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (!isLocationAutoFilled) {
      alert('Please get your location first before submitting');
      return;
    }

    if (!files.length) {
      if (!window.confirm("No files selected. Continue and only store metadata?")) {
        return;
      }
    }

    setIsSubmitting(true);
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
          JSON.stringify({ name: `collection-${farmerName || "unnamed"}`, keyvalues: { farmerName } })
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
          const pinMetadata = { name: file.name, keyvalues: { farmerName } };

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
        recordType: "collectionEvent",
        farmerName,
        species,
        weight,
        harvestDate,
        location: { latitude, longitude },
        qualityNotes,
        uploaderAddress: (window && window.ethereum && window.ethereum.selectedAddress) || null,
        files: fileEntries,
        createdAt: new Date().toISOString()
      };

      // Pin JSON record
      const metaPinName = `collection-metadata-${farmerName || "unknown"}-${Date.now()}`;
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

      // Show success message
      alert(`Success! Metadata CID: ${metadataCid}`);
      
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="collection-event">
      <div className="event-header">
        <h2>Collection Event</h2>
        <p>Document your herb harvest with geo-tagging, file attachments, and IPFS storage</p>
      </div>

      <div className="form-layout">
        <form onSubmit={handleSubmit} className="collection-form">
          <div className="form-section">
            <h3>Collection Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="farmerName">Farmer Name *</label>
                <input
                  id="farmerName"
                  type="text"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="Enter farmer's name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="species">Species / Crop *</label>
                <select
                  id="species"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select Species</option>
                  <option value="ashwagandha">Ashwagandha</option>
                  <option value="tulsi">Tulsi</option>
                  <option value="turmeric">Turmeric</option>
                  <option value="neem">Neem</option>
                  <option value="amla">Amla</option>
                  <option value="brahmi">Brahmi</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="weight">Weight (kg) *</label>
                <input
                  id="weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="harvestDate">Harvest Date *</label>
                <input
                  id="harvestDate"
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group location-group">
                <label htmlFor="location">GPS Location *</label>
                <div className="location-inputs">
                  <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                    <input
                      type="text"
                      placeholder="Latitude (auto-detected)"
                      value={latitude}
                      onChange={handleLocationChange}
                      onKeyDown={handleLocationChange}
                      disabled={true}
                      readOnly={true}
                      className={isLocationAutoFilled ? 'location-auto-filled' : ''}
                    />
                    <input
                      type="text"
                      placeholder="Longitude (auto-detected)"
                      value={longitude}
                      onChange={handleLocationChange}
                      onKeyDown={handleLocationChange}
                      disabled={true}
                      readOnly={true}
                      className={isLocationAutoFilled ? 'location-auto-filled' : ''}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="gps-btn"
                    onClick={getCurrentLocation}
                    disabled={isSubmitting || isLocationAutoFilled}
                  >
                    📍 Get Location
                  </button>
                </div>
                {isLocationAutoFilled ? (
                  <div className="location-note">
                    <small>✅ Location successfully auto-detected and locked</small>
                  </div>
                ) : (
                  <div className="location-note">
                    <small>📍 Location is required. Click "Get Location" to auto-detect your current position.</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>File Attachments</h3>
            <div className="form-group">
              <label htmlFor="files">Attach Images / Reports</label>
              <input 
                ref={fileInputRef} 
                type="file" 
                multiple 
                onChange={handleFilesChange}
                disabled={isSubmitting}
                id="files"
              />
              <small>Upload images, documents, or reports related to this collection</small>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={wrapAsDirectory} 
                  onChange={(e) => setWrapAsDirectory(e.target.checked)}
                  disabled={isSubmitting}
                />
                Upload as directory (wrapWithDirectory) - Recommended for multiple files
              </label>
            </div>

            {files.length > 0 && (
              <div className="files-preview">
                <h4>Selected Files ({files.length})</h4>
                <ul>
                  {files.map((file, index) => (
                    <li key={index}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Quality Notes</h3>
            <div className="form-group">
              <label htmlFor="qualityNotes">Additional Information</label>
              <textarea
                id="qualityNotes"
                rows="4"
                value={qualityNotes}
                onChange={(e) => setQualityNotes(e.target.value)}
                placeholder="Describe the herb quality, appearance, and any special notes..."
                disabled={isSubmitting}
              ></textarea>
            </div>
          </div>

          {Object.keys(progresses).length > 0 && (
            <div className="form-section">
              <h3>Upload Progress</h3>
              <div className="upload-progress">
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
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting || !isLocationAutoFilled}
            >
              {isSubmitting ? '⏳ Uploading to IPFS...' : '🌿 Upload & Save Record (Pinata)'}
            </button>
            <button 
              type="button" 
              className="reset-btn"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Reset Form
            </button>
            {!isLocationAutoFilled && (
              <div className="location-required-warning">
                ⚠️ Please get your location first before submitting
              </div>
            )}
          </div>
        </form>

        <div className="preview-panel">
          <div className="preview-header">
            <h3>Preview</h3>
          </div>
          <div className="preview-card">
            <div className="preview-item">
              <span>Farmer Name:</span>
              <strong>{farmerName || 'Not specified'}</strong>
            </div>
            <div className="preview-item">
              <span>Species:</span>
              <strong>{species || 'Not specified'}</strong>
            </div>
            <div className="preview-item">
              <span>Weight:</span>
              <strong>{weight || '0'} kg</strong>
            </div>
            <div className="preview-item">
              <span>Harvest Date:</span>
              <strong>{harvestDate || 'Not specified'}</strong>
            </div>
            <div className="preview-item">
              <span>Location:</span>
              <strong>
                {latitude && longitude ? `${latitude}, ${longitude}` : 'Not specified'}
              </strong>
            </div>
            <div className="preview-item">
              <span>Files:</span>
              <strong>{files.length} file(s)</strong>
            </div>
            {qualityNotes && (
              <div className="preview-item">
                <span>Quality Notes:</span>
                <div className="notes-preview">{qualityNotes}</div>
              </div>
            )}
          </div>

          {results && (
            <div className="results-section">
              <h4>Upload Results</h4>
              <div className="results-card">
                <div className="result-item">
                  <span>IPFS Metadata CID:</span>
                  <a href={results.metadataGateway} target="_blank" rel="noopener noreferrer">
                    {results.metadataCid}
                  </a>
                </div>
                <div className="result-item">
                  <span>Files Uploaded:</span>
                  <span>{results.files.length}</span>
                </div>
              </div>
            </div>
          )}

          <div className="blockchain-info">
            <h4>Storage Information</h4>
            <div className="info-item">
              <span>Storage Provider:</span>
              <span>Pinata IPFS</span>
            </div>
            <div className="info-item">
              <span>Network:</span>
              <span>IPFS Distributed Storage</span>
            </div>
            <div className="info-item">
              <span>Cost:</span>
              <span>Free (Pinata)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}