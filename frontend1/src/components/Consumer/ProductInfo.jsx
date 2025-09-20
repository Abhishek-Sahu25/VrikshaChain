import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBlockchain } from '../../hooks';
import './ProductInfo.css';

const ProductInfo = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockchainData, setBlockchainData] = useState(null);
  const { contracts } = useBlockchain();

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    setLoading(true);
    try {
      // Try to fetch from blockchain first
      let blockchainInfo = null;
      if (contracts.batchToken && id) {
        try {
          const batchData = await contracts.batchToken.batches(id);
          if (batchData && batchData.id) {
            blockchainInfo = {
              id: batchData.id.toString(),
              timestamp: new Date(batchData.timestamp * 1000).toLocaleDateString(),
              cid: batchData.metadataCID,
              state: ['Created', 'Tested', 'Processed', 'Shipped'][batchData.state] || 'Unknown'
            };
          }
        } catch (error) {
          console.log('Batch not found on blockchain, using mock data');
        }
      }

      // Mock data - replace with actual API call
      const mockProduct = {
        id: id || 'ASH-2023-0012',
        name: 'Organic Ashwagandha Root Powder',
        brand: 'Prakriti Ayurveda',
        description: 'Premium quality Ashwagandha root powder harvested from organic farms in Maharashtra. Known for its adaptogenic properties and traditional Ayurvedic benefits.',
        ingredients: '100% Pure Ashwagandha Root Extract',
        benefits: [
          'Reduces stress and anxiety',
          'Improves sleep quality',
          'Enhances brain function',
          'Boosts immunity',
          'Supports adrenal function'
        ],
        usage: 'Take 1-2 teaspoons daily with warm milk or water',
        precautions: 'Consult healthcare provider if pregnant, nursing, or taking medications',
        certification: 'USDA Organic, Ayurvedic Certification, GMP Certified',
        batchInfo: {
          harvestDate: '2023-06-15',
          expiryDate: '2025-06-15',
          batchNumber: id || 'ASH-2023-0012',
          netWeight: '200g'
        },
        sustainability: {
          score: 95,
          organic: true,
          fairTrade: true,
          carbonNeutral: true,
          waterConservation: '45,000 liters saved'
        },
        blockchain: blockchainInfo || {
          verified: true,
          transactionHash: '0x742d35Cc6634C893292...',
          timestamp: '2023-06-15'
        }
      };
      
      setProduct(mockProduct);
      setBlockchainData(blockchainInfo);
    } catch (error) {
      console.error('Error fetching product data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="product-info-loading">
        <div className="loading-spinner-3d"></div>
        <p>Loading product information...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-info-error">
        <h3>Product Not Found</h3>
        <p>Unable to retrieve product information. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="product-info">
      <div className="product-hero">
        <div className="product-image-3d">
          <div className="product-visual">
            <div className="herb-container">
              <div className="floating-herb">🌿</div>
              <div className="herb-glow"></div>
            </div>
          </div>
        </div>
        <div className="product-basic-info">
          <h1>{product.name}</h1>
          <p className="product-brand">{product.brand}</p>
          <div className="product-batch">
            <span>Batch: {product.batchInfo.batchNumber}</span>
            {blockchainData && (
              <span className="blockchain-badge">⛓️ Blockchain Verified</span>
            )}
          </div>
        </div>
      </div>

      <div className="product-details-grid">
        <div className="detail-card-3d">
          <h3>📖 Description</h3>
          <p>{product.description}</p>
        </div>

        <div className="detail-card-3d">
          <h3>🌿 Ingredients</h3>
          <p>{product.ingredients}</p>
        </div>

        <div className="detail-card-3d">
          <h3>💚 Health Benefits</h3>
          <ul className="benefits-list">
            {product.benefits.map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </div>

        <div className="detail-card-3d">
          <h3>⚡ Usage Instructions</h3>
          <p>{product.usage}</p>
        </div>

        <div className="detail-card-3d">
          <h3>⚠️ Precautions</h3>
          <p>{product.precautions}</p>
        </div>

        <div className="detail-card-3d">
          <h3>📜 Certifications</h3>
          <div className="certifications">
            {product.certification.split(', ').map((cert, index) => (
              <span key={index} className="certification-badge">{cert}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="batch-info-section">
        <h2>Batch Information</h2>
        <div className="batch-grid-3d">
          <div className="batch-item">
            <span className="batch-label">Harvest Date</span>
            <span className="batch-value">{product.batchInfo.harvestDate}</span>
          </div>
          <div className="batch-item">
            <span className="batch-label">Expiry Date</span>
            <span className="batch-value">{product.batchInfo.expiryDate}</span>
          </div>
          <div className="batch-item">
            <span className="batch-label">Batch Number</span>
            <span className="batch-value">{product.batchInfo.batchNumber}</span>
          </div>
          <div className="batch-item">
            <span className="batch-label">Net Weight</span>
            <span className="batch-value">{product.batchInfo.netWeight}</span>
          </div>
          {blockchainData && (
            <>
              <div className="batch-item">
                <span className="batch-label">Blockchain Timestamp</span>
                <span className="batch-value">{blockchainData.timestamp}</span>
              </div>
              <div className="batch-item">
                <span className="batch-label">Blockchain Status</span>
                <span className="batch-value">{blockchainData.state}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="sustainability-section">
        <h2>🌱 Sustainability Impact</h2>
        <div className="sustainability-card-3d">
          <div className="sustainability-score">
            <div className="score-circle">
              <span className="score-value">{product.sustainability.score}</span>
              <span className="score-label">Sustainability Score</span>
            </div>
          </div>
          <div className="sustainability-features">
            <div className="feature-item">
              <span className="feature-icon">🌿</span>
              <span>Organic Farming</span>
              <span className="feature-status">{product.sustainability.organic ? '✅' : '❌'}</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤝</span>
              <span>Fair Trade Practices</span>
              <span className="feature-status">{product.sustainability.fairTrade ? '✅' : '❌'}</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🌍</span>
              <span>Carbon Neutral</span>
              <span className="feature-status">{product.sustainability.carbonNeutral ? '✅' : '❌'}</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💧</span>
              <span>Water Conservation</span>
              <span className="feature-value">{product.sustainability.waterConservation}</span>
            </div>
          </div>
        </div>
      </div>

      {blockchainData && (
        <div className="blockchain-section">
          <h2>⛓️ Blockchain Verification</h2>
          <div className="blockchain-card">
            <div className="blockchain-info">
              <div className="info-item">
                <span className="info-label">Transaction Hash:</span>
                <span className="info-value">{product.blockchain.transactionHash}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Timestamp:</span>
                <span className="info-value">{product.blockchain.timestamp}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value verified">✅ Verified</span>
              </div>
            </div>
            <button className="view-blockchain-btn">
              🔍 View on Blockchain Explorer
            </button>
          </div>
        </div>
      )}

      <div className="product-actions">
        <a href={`/provenance/${product.id}`} className="action-btn view-provenance">
          📖 View Full Provenance
        </a>
        <button className="action-btn share-product">
          📤 Share Product Info
        </button>
      </div>

      <div className="floating-product-elements">
        <div className="product-element">🌿</div>
        <div className="product-element">✨</div>
        <div className="product-element">💚</div>
      </div>
    </div>
  );
};

export default ProductInfo;