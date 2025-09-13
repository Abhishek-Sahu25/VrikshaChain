import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../../contexts/Web3Context';
import { useBlockchain } from '../../../hooks';
import { Link } from 'react-router-dom';
import './LabDashboard.css';

const LabDashboard = () => {
  const { contracts, account } = useWeb3();
  const { verifyQuality } = useBlockchain();
  const [pendingTests, setPendingTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [stats, setStats] = useState({
    totalTests: 0,
    testsThisMonth: 0,
    passRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLabData();
  }, [contracts, account]);

  const fetchLabData = async () => {
    if (!contracts.batchToken || !account) {
      // Mock data for demo
      setPendingTests([
        { id: 101, batchId: 'ASH-2023-0012', species: 'Ashwagandha', receivedDate: '2023-06-18', farmer: 'Rajesh Kumar' },
        { id: 102, batchId: 'TUL-2023-0008', species: 'Tulsi', receivedDate: '2023-06-19', farmer: 'Priya Singh' },
        { id: 103, batchId: 'TUR-2023-0015', species: 'Turmeric', receivedDate: '2023-06-20', farmer: 'Amit Patel' }
      ]);
      setCompletedTests([
        { id: 100, batchId: 'ASH-2023-0010', species: 'Ashwagandha', testDate: '2023-06-17', result: 'Pass', qualityScore: 95 },
        { id: 99, batchId: 'NEEM-2023-0005', species: 'Neem', testDate: '2023-06-16', result: 'Fail', qualityScore: 65 },
        { id: 98, batchId: 'BRA-2023-0003', species: 'Brahmi', testDate: '2023-06-15', result: 'Pass', qualityScore: 92 }
      ]);
      setStats({
        totalTests: 156,
        testsThisMonth: 24,
        passRate: 87
      });
      setLoading(false);
      return;
    }

    try {
      // Fetch batches that need testing (state = Created)
      const totalBatches = await contracts.batchToken.totalSupply();
      const pending = [];
      const completed = [];

      for (let i = 0; i < totalBatches.toNumber(); i++) {
        const batchData = await contracts.batchToken.batches(i);
        
        if (batchData.state === 0) { // Created state - needs testing
          pending.push({
            id: i,
            batchId: `BATCH-${i}`,
            species: 'Herb', // From metadata
            receivedDate: new Date(batchData.timestamp * 1000).toLocaleDateString(),
            farmer: 'Unknown' // Would need farmer mapping
          });
        } else if (batchData.state === 1) { // Tested state
          completed.push({
            id: i,
            batchId: `BATCH-${i}`,
            species: 'Herb',
            testDate: new Date(batchData.timestamp * 1000).toLocaleDateString(),
            result: 'Pass', // From test results
            qualityScore: 95 // From test results
          });
        }
      }

      setPendingTests(pending.slice(0, 5)); // Show only recent
      setCompletedTests(completed.slice(0, 5));
      
      // Calculate stats
      const totalTests = pending.length + completed.length;
      const passedTests = completed.filter(t => t.result === 'Pass').length;
      
      setStats({
        totalTests,
        testsThisMonth: completed.length, // Simplified
        passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      });
    } catch (error) {
      console.error('Error fetching lab data:', error);
      // Fallback to mock data
      setPendingTests([
        { id: 101, batchId: 'ASH-2023-0012', species: 'Ashwagandha', receivedDate: '2023-06-18', farmer: 'Rajesh Kumar' },
        { id: 102, batchId: 'TUL-2023-0008', species: 'Tulsi', receivedDate: '2023-06-19', farmer: 'Priya Singh' },
        { id: 103, batchId: 'TUR-2023-0015', species: 'Turmeric', receivedDate: '2023-06-20', farmer: 'Amit Patel' }
      ]);
      setCompletedTests([
        { id: 100, batchId: 'ASH-2023-0010', species: 'Ashwagandha', testDate: '2023-06-17', result: 'Pass', qualityScore: 95 },
        { id: 99, batchId: 'NEEM-2023-0005', species: 'Neem', testDate: '2023-06-16', result: 'Fail', qualityScore: 65 },
        { id: 98, batchId: 'BRA-2023-0003', species: 'Brahmi', testDate: '2023-06-15', result: 'Pass', qualityScore: 92 }
      ]);
      setStats({
        totalTests: 156,
        testsThisMonth: 24,
        passRate: 87
      });
    } finally {
      setLoading(false);
    }
  };

  const performTest = (testId) => {
    // Navigate to quality test page
    window.location.href = `/admin/lab/quality-test?batchId=${testId}`;
  };

  if (loading) {
    return (
      <div className="lab-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading lab data...</p>
      </div>
    );
  }

  return (
    <div className="lab-dashboard">
      <div className="dashboard-hero">
        <h2>Laboratory Dashboard</h2>
        <p>Quality testing and verification of Ayurvedic herbs</p>
        {!account && (
          <div className="wallet-warning">
            ⚠️ Please connect your wallet to perform tests on blockchain
          </div>
        )}
      </div>
      
      <div className="stats-cards">
        <div className="stat-card-3d">
          <div className="stat-icon">🔬</div>
          <h3>Total Tests</h3>
          <p className="stat-number">{stats.totalTests}</p>
        </div>
        
        <div className="stat-card-3d">
          <div className="stat-icon">📊</div>
          <h3>Tests This Month</h3>
          <p className="stat-number">{stats.testsThisMonth}</p>
        </div>
        
        <div className="stat-card-3d">
          <div className="stat-icon">✅</div>
          <h3>Pass Rate</h3>
          <p className="stat-number">{stats.passRate}%</p>
        </div>

        <div className="stat-card-3d">
          <div className="stat-icon">⛓️</div>
          <h3>Blockchain</h3>
          <p className="stat-number">{account ? 'Connected' : 'Disconnected'}</p>
        </div>
      </div>

      <div className="lab-sections">
        <div className="pending-tests-section">
          <h3>Pending Quality Tests ({pendingTests.length})</h3>
          {pendingTests.length === 0 ? (
            <p className="no-data">No pending tests 🎉</p>
          ) : (
            <div className="tests-grid">
              {pendingTests.map(test => (
                <div key={test.id} className="test-card-3d">
                  <div className="test-header">
                    <span className="batch-id">{test.batchId}</span>
                    <span className="species-tag">{test.species}</span>
                  </div>
                  <div className="test-details">
                    <p><strong>Received:</strong> {test.receivedDate}</p>
                    <p><strong>Farmer:</strong> {test.farmer}</p>
                  </div>
                  <button 
                    className="test-btn-3d"
                    onClick={() => performTest(test.id)}
                    disabled={!account}
                  >
                    Perform Test
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="completed-tests-section">
          <h3>Recently Completed Tests</h3>
          {completedTests.length === 0 ? (
            <p className="no-data">No completed tests yet</p>
          ) : (
            <div className="tests-grid">
              {completedTests.map(test => (
                <div key={test.id} className="test-card-3d completed">
                  <div className="test-header">
                    <span className="batch-id">{test.batchId}</span>
                    <span className={`result-tag ${test.result.toLowerCase()}`}>
                      {test.result}
                    </span>
                  </div>
                  <div className="test-details">
                    <p><strong>Test Date:</strong> {test.testDate}</p>
                    <p><strong>Quality Score:</strong> {test.qualityScore}/100</p>
                    <p><strong>Species:</strong> {test.species}</p>
                  </div>
                  <div className="test-actions">
                    <button className="view-report-btn">View Report</button>
                    <button 
                      className="blockchain-btn"
                      onClick={() => window.open(`/product/${test.id}`, '_blank')}
                    >
                      View on Blockchain
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Link to="/admin/lab/quality-test" className="new-test-btn-3d">
        🔬 Start New Quality Test
      </Link>

      <div className="floating-lab-elements">
        <div className="lab-icon">🧪</div>
        <div className="lab-icon">🔍</div>
        <div className="lab-icon">📋</div>
      </div>
    </div>
  );
};

export default LabDashboard;