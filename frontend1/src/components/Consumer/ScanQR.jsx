import React, { useState, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useBlockchain } from '../../hooks';
import './ScanQR.css';

const ScanQR = ({ onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [manualBatchId, setManualBatchId] = useState('');
  const { setScannedProduct } = useApp();
  const { contracts } = useBlockchain();

  const startScanning = () => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);
    
    // Simulate QR code scanning (replace with actual QR scanner implementation)
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate for demo
      
      if (success) {
        const mockProductId = 'ASH-2023-0012';
        setScanResult(mockProductId);
        if (onScanComplete) {
          onScanComplete(mockProductId);
        }
        setScannedProduct(mockProductId);
      } else {
        setError('Failed to scan QR code. Please try again.');
      }
      setIsScanning(false);
    }, 2000);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualBatchId) return;
    
    try {
      // Verify batch exists on blockchain
      if (contracts.batchToken) {
        const batchData = await contracts.batchToken.batches(manualBatchId);
        if (batchData && batchData.id) {
          setScanResult(manualBatchId);
          setScannedProduct(manualBatchId);
          setError(null);
        } else {
          setError('Batch not found on blockchain');
        }
      } else {
        // Fallback for demo
        setScanResult(manualBatchId);
        setScannedProduct(manualBatchId);
        setError(null);
      }
    } catch (err) {
      setError('Invalid batch ID or blockchain error');
      console.error('Error verifying batch:', err);
    }
  };

  const resetScan = () => {
    setIsScanning(false);
    setScanResult(null);
    setError(null);
    setManualBatchId('');
  };

  return (
    <div className="scan-qr">
      <div className="scan-header">
        <h2>Scan Product QR Code</h2>
        <p>Scan the QR code on your Ayurvedic product to verify authenticity and view complete provenance</p>
      </div>

      <div className="scanner-container">
        <div className="scanner-frame-3d">
          <div className="scanner-overlay">
            {!isScanning && !scanResult && (
              <div className="scan-placeholder">
                <div className="qr-icon">📱</div>
                <p>Position QR code within frame</p>
              </div>
            )}
            
            {isScanning && (
              <div className="scanning-animation">
                <div className="scanner-beam"></div>
                <div className="scanning-text">Scanning...</div>
              </div>
            )}
            
            {scanResult && (
              <div className="scan-success">
                <div className="success-icon">✅</div>
                <h3>Product Verified!</h3>
                <p>Batch: {scanResult}</p>
                <a href={`/provenance/${scanResult}`} className="view-details-btn">
                  View Full Details
                </a>
              </div>
            )}
            
            {error && (
              <div className="scan-error">
                <div className="error-icon">❌</div>
                <h3>Scan Failed</h3>
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="scanner-controls">
          {!isScanning && !scanResult && (
            <button className="scan-btn-3d" onClick={startScanning}>
              📷 Start Scanning
            </button>
          )}
          
          {(scanResult || error) && (
            <button className="rescan-btn" onClick={resetScan}>
              🔄 Scan Another Code
            </button>
          )}
        </div>
      </div>

      <div className="scan-features">
        <h3>What You'll Discover</h3>
        <div className="features-grid">
          <div className="feature-item-3d">
            <div className="feature-icon">🌿</div>
            <h4>Origin Verification</h4>
            <p>Authentic harvest location and farming practices</p>
          </div>
          <div className="feature-item-3d">
            <div className="feature-icon">🔬</div>
            <h4>Quality Reports</h4>
            <p>Laboratory test results and purity certification</p>
          </div>
          <div className="feature-item-3d">
            <div className="feature-icon">📦</div>
            <h4>Supply Chain</h4>
            <p>Complete journey from farm to your hands</p>
          </div>
          <div className="feature-item-3d">
            <div className="feature-icon">🌱</div>
            <h4>Sustainability</h4>
            <p>Environmental impact and ethical practices</p>
          </div>
        </div>
      </div>

      <div className="manual-input">
        <h3>Or Enter Batch Number Manually</h3>
        <form onSubmit={handleManualSubmit} className="input-group">
          <input
            type="text"
            value={manualBatchId}
            onChange={(e) => setManualBatchId(e.target.value)}
            placeholder="Enter Batch ID (e.g., ASH-2023-0012)"
            className="batch-input"
            required
          />
          <button type="submit" className="submit-btn">Verify</button>
        </form>
      </div>

      <div className="floating-scan-elements">
        <div className="scan-element">📱</div>
        <div className="scan-element">✨</div>
        <div className="scan-element">🔍</div>
      </div>
    </div>
  );
};

export default ScanQR;