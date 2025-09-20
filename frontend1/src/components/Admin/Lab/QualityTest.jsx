import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../../contexts/Web3Context';
import { useBlockchain } from '../../../hooks';
import { useApp } from '../../../contexts/AppContext';
import { useSearchParams } from 'react-router-dom';
import './QualityTest.css';

const QualityTest = () => {
  const [testData, setTestData] = useState({
    batchId: '',
    species: '',
    moistureContent: '',
    pesticideLevel: '',
    heavyMetals: '',
    microbialCount: '',
    activeCompounds: '',
    overallScore: '',
    testResult: 'pass',
    notes: '',
    labTechnician: '',
    testDate: new Date().toISOString().split('T')[0]
  });
  const { account, signer } = useWeb3();
  const { verifyQuality } = useBlockchain();
  const { showNotification } = useApp();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchInfo, setBatchInfo] = useState(null);

  useEffect(() => {
    const batchId = searchParams.get('batchId');
    if (batchId) {
      setTestData(prev => ({ ...prev, batchId }));
      fetchBatchInfo(batchId);
    }
  }, [searchParams]);

  const fetchBatchInfo = async (batchId) => {
    // In a real app, fetch batch details from blockchain or API
    const mockBatchInfo = {
      species: 'Ashwagandha',
      harvestDate: '2023-06-15',
      farmer: 'Rajesh Kumar',
      location: 'Maharashtra, India'
    };
    setBatchInfo(mockBatchInfo);
    setTestData(prev => ({ ...prev, species: mockBatchInfo.species }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account || !signer) {
      showNotification({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to verify quality results'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare test data for blockchain verification
      const qualityData = {
        batchId: testData.batchId,
        species: testData.species,
        moistureContent: parseFloat(testData.moistureContent),
        pesticideLevel: parseFloat(testData.pesticideLevel),
        heavyMetals: parseFloat(testData.heavyMetals),
        microbialCount: parseInt(testData.microbialCount),
        activeCompounds: parseFloat(testData.activeCompounds),
        overallScore: calculateScore(),
        testResult: testData.testResult,
        notes: testData.notes,
        labTechnician: account,
        testDate: Math.floor(new Date(testData.testDate).getTime() / 1000)
      };

      // For EIP-712 signing (simplified)
      const signature = await signer.signMessage(JSON.stringify(qualityData));

      // Verify quality on blockchain
      const result = await verifyQuality({
        ...qualityData,
        signature,
        nonce: Date.now()
      });

      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Quality Verified',
          message: 'Quality test results have been recorded on the blockchain'
        });
        
        // Reset form
        setTestData({
          batchId: '',
          species: '',
          moistureContent: '',
          pesticideLevel: '',
          heavyMetals: '',
          microbialCount: '',
          activeCompounds: '',
          overallScore: '',
          testResult: 'pass',
          notes: '',
          labTechnician: '',
          testDate: new Date().toISOString().split('T')[0]
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error verifying quality:', error);
      showNotification({
        type: 'error',
        title: 'Verification Failed',
        message: error.message || 'Failed to verify quality on blockchain'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setTestData({
      ...testData,
      [e.target.name]: e.target.value
    });
  };

  const calculateScore = () => {
    // Simple scoring calculation
    const moisture = testData.moistureContent ? parseFloat(testData.moistureContent) : 0;
    const pesticides = testData.pesticideLevel ? parseFloat(testData.pesticideLevel) : 0;
    const metals = testData.heavyMetals ? parseFloat(testData.heavyMetals) : 0;
    const microbial = testData.microbialCount ? parseInt(testData.microbialCount) : 0;
    const compounds = testData.activeCompounds ? parseFloat(testData.activeCompounds) : 0;
    
    const score = 100 - (
      (Math.max(0, moisture - 8) * 2) +
      (pesticides * 3) +
      (metals * 4) +
      (Math.max(0, microbial - 100) / 10) +
      (Math.max(0, 90 - compounds) * 2)
    );
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  return (
    <div className="quality-test">
      <div className="test-header">
        <h2>Quality Test Procedure</h2>
        <p>Perform comprehensive quality testing for Ayurvedic herbs</p>
        {!account && (
          <div className="wallet-warning">
            ⚠️ Please connect your wallet to verify test results on blockchain
          </div>
        )}
      </div>

      {batchInfo && (
        <div className="batch-info-card">
          <h4>Batch Information</h4>
          <div className="batch-details">
            <p><strong>Species:</strong> {batchInfo.species}</p>
            <p><strong>Harvest Date:</strong> {batchInfo.harvestDate}</p>
            <p><strong>Farmer:</strong> {batchInfo.farmer}</p>
            <p><strong>Location:</strong> {batchInfo.location}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="test-form-3d">
        <div className="form-section">
          <h3>Batch Information</h3>
          <div className="form-grid">
            <div className="form-group-3d">
              <label htmlFor="batchId">Batch ID</label>
              <input
                type="text"
                id="batchId"
                name="batchId"
                value={testData.batchId}
                onChange={handleChange}
                required
                placeholder="ASH-2023-0012"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group-3d">
              <label htmlFor="species">Herb Species</label>
              <select
                id="species"
                name="species"
                value={testData.species}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              >
                <option value="">Select Herb</option>
                <option value="ashwagandha">Ashwagandha</option>
                <option value="tulsi">Tulsi</option>
                <option value="turmeric">Turmeric</option>
                <option value="neem">Neem</option>
                <option value="amla">Amla</option>
                <option value="brahmi">Brahmi</option>
              </select>
            </div>

            <div className="form-group-3d">
              <label htmlFor="testDate">Test Date</label>
              <input
                type="date"
                id="testDate"
                name="testDate"
                value={testData.testDate}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group-3d">
              <label htmlFor="labTechnician">Lab Technician</label>
              <input
                type="text"
                id="labTechnician"
                name="labTechnician"
                value={account || ''}
                onChange={handleChange}
                required
                disabled
                placeholder="Will be filled automatically from wallet"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Test Parameters</h3>
          <div className="form-grid">
            <div className="form-group-3d">
              <label htmlFor="moistureContent">Moisture Content (%)</label>
              <input
                type="number"
                id="moistureContent"
                name="moistureContent"
                value={testData.moistureContent}
                onChange={handleChange}
                min="0"
                max="20"
                step="0.1"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group-3d">
              <label htmlFor="pesticideLevel">Pesticide Level (ppm)</label>
              <input
                type="number"
                id="pesticideLevel"
                name="pesticideLevel"
                value={testData.pesticideLevel}
                onChange={handleChange}
                min="0"
                max="10"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group-3d">
              <label htmlFor="heavyMetals">Heavy Metals (ppm)</label>
              <input
                type="number"
                id="heavyMetals"
                name="heavyMetals"
                value={testData.heavyMetals}
                onChange={handleChange}
                min="0"
                max="5"
                step="0.01"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group-3d">
              <label htmlFor="microbialCount">Microbial Count (CFU/g)</label>
              <input
                type="number"
                id="microbialCount"
                name="microbialCount"
                value={testData.microbialCount}
                onChange={handleChange}
                min="0"
                max="10000"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group-3d">
              <label htmlFor="activeCompounds">Active Compounds (%)</label>
              <input
                type="number"
                id="activeCompounds"
                name="activeCompounds"
                value={testData.activeCompounds}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group-3d">
              <label htmlFor="overallScore">Overall Quality Score</label>
              <input
                type="number"
                id="overallScore"
                name="overallScore"
                value={calculateScore()}
                readOnly
                className="score-input"
              />
              <div className="score-bar">
                <div 
                  className="score-fill"
                  style={{ width: `${calculateScore()}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Test Results</h3>
          <div className="form-grid">
            <div className="form-group-3d">
              <label htmlFor="testResult">Test Result</label>
              <select
                id="testResult"
                name="testResult"
                value={testData.testResult}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              >
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="conditional">Conditional</option>
              </select>
            </div>

            <div className="form-group-3d full-width">
              <label htmlFor="notes">Test Notes & Observations</label>
              <textarea
                id="notes"
                name="notes"
                rows="4"
                value={testData.notes}
                onChange={handleChange}
                placeholder="Detailed observations, special notes, and recommendations..."
                disabled={isSubmitting}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-test-btn-3d"
            disabled={!account || isSubmitting}
          >
            {isSubmitting ? '⏳ Verifying...' : '📋 Verify Test Results on Blockchain'}
          </button>
        </div>
      </form>

      <div className="test-visualization">
        <h3>Quality Metrics Visualization</h3>
        <div className="metrics-grid-3d">
          <div className="metric-circle">
            <div className="circle-progress" style={{ '--progress': `${testData.moistureContent ? (100 - (testData.moistureContent * 5)) : 0}%` }}>
              <span>Moisture</span>
              <span>{testData.moistureContent || 0}%</span>
            </div>
          </div>
          
          <div className="metric-circle">
            <div className="circle-progress" style={{ '--progress': `${testData.pesticideLevel ? (100 - (testData.pesticideLevel * 10)) : 0}%` }}>
              <span>Pesticides</span>
              <span>{testData.pesticideLevel || 0}ppm</span>
            </div>
          </div>
          
          <div className="metric-circle">
            <div className="circle-progress" style={{ '--progress': `${testData.heavyMetals ? (100 - (testData.heavyMetals * 20)) : 0}%` }}>
              <span>Metals</span>
              <span>{testData.heavyMetals || 0}ppm</span>
            </div>
          </div>
          
          <div className="metric-circle">
            <div className="circle-progress" style={{ '--progress': `${testData.activeCompounds || 0}%` }}>
              <span>Active Compounds</span>
              <span>{testData.activeCompounds || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="blockchain-info">
        <h4>Blockchain Verification</h4>
        <div className="verification-details">
          <p>This quality test will be permanently recorded on the blockchain with the following details:</p>
          <ul>
            <li>🔒 Immutable record of test results</li>
            <li>👤 Lab technician's digital signature</li>
            <li>⏰ Timestamp of verification</li>
            <li>📊 All quality parameters stored on-chain</li>
          </ul>
        </div>
      </div>

      <div className="floating-lab-icons">
        <div className="lab-float">🧪</div>
        <div className="lab-float">🔬</div>
        <div className="lab-float">📊</div>
      </div>
    </div>
  );
};

export default QualityTest;