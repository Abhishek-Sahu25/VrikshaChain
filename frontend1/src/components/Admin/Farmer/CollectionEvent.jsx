import React, { useState } from 'react';
import { useWeb3 } from '../../../contexts/Web3Context';
import { useBlockchain } from '../../../hooks';
import { useApp } from '../../../contexts/AppContext';
import './CollectionEvent.css';

const CollectionEvent = () => {
  const [formData, setFormData] = useState({
    species: '',
    weight: '',
    location: '',
    harvestDate: '',
    qualityNotes: '',
    geoLat: '',
    geoLong: ''
  });
  const { account, signer } = useWeb3();
  const { createBatch } = useBlockchain();
  const { showNotification } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account || !signer) {
      showNotification({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to create a collection'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare batch data for blockchain
      const batchData = {
        to: account,
        species: formData.species,
        weight: formData.weight,
        location: formData.location,
        timestamp: Math.floor(new Date(formData.harvestDate).getTime() / 1000),
        metadata: {
          qualityNotes: formData.qualityNotes,
          geoLocation: `${formData.geoLat}, ${formData.geoLong}`
        }
      };

      // For EIP-712 signing (simplified version)
      const domain = {
        name: 'VrikshaChain Batch',
        version: '1',
        chainId: 1, // Mainnet - should be dynamic
        verifyingContract: '0x...' // Your contract address
      };

      const types = {
        Batch: [
          { name: 'to', type: 'address' },
          { name: 'species', type: 'string' },
          { name: 'weight', type: 'uint256' },
          { name: 'location', type: 'string' },
          { name: 'timestamp', type: 'uint256' }
        ]
      };

      // Sign the message (simplified - in real app, use proper EIP-712 signing)
      const signature = await signer.signMessage(JSON.stringify(batchData));

      // Create batch on blockchain
      const result = await createBatch({
        ...batchData,
        signature,
        nonce: Date.now()
      });

      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Collection Created',
          message: 'Your herb collection has been recorded on the blockchain'
        });
        
        // Reset form
        setFormData({
          species: '',
          weight: '',
          location: '',
          harvestDate: '',
          qualityNotes: '',
          geoLat: '',
          geoLong: ''
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      showNotification({
        type: 'error',
        title: 'Creation Failed',
        message: error.message || 'Failed to create collection on blockchain'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            geoLat: position.coords.latitude.toFixed(6),
            geoLong: position.coords.longitude.toFixed(6),
            location: `${position.coords.latitude.toFixed(6)}° N, ${position.coords.longitude.toFixed(6)}° E`
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          showNotification({
            type: 'error',
            title: 'Location Error',
            message: 'Could not retrieve your location. Please enter manually.'
          });
        }
      );
    }
  };

  return (
    <div className="collection-event">
      <div className="event-header">
        <h2>Record New Collection</h2>
        <p>Document your herb harvest with geo-tagging and quality details</p>
        {!account && (
          <div className="wallet-warning">
            ⚠️ Please connect your wallet to record collections on blockchain
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="collection-form-3d">
        <div className="form-grid">
          <div className="form-group-3d">
            <label htmlFor="species">Herb Species</label>
            <select
              id="species"
              name="species"
              value={formData.species}
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
            <label htmlFor="weight">Weight (kg)</label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              required
              min="0"
              step="0.1"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group-3d">
            <label htmlFor="location">GPS Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="12.9716° N, 77.5946° E"
              disabled={isSubmitting}
            />
            <button 
              type="button" 
              className="gps-btn"
              onClick={getCurrentLocation}
              disabled={isSubmitting}
            >
              📍 Get Current Location
            </button>
            <div className="geo-coordinates">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={formData.geoLat}
                onChange={(e) => setFormData({...formData, geoLat: e.target.value})}
                disabled={isSubmitting}
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={formData.geoLong}
                onChange={(e) => setFormData({...formData, geoLong: e.target.value})}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group-3d">
            <label htmlFor="harvestDate">Harvest Date</label>
            <input
              type="date"
              id="harvestDate"
              name="harvestDate"
              value={formData.harvestDate}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="form-group-3d">
          <label htmlFor="qualityNotes">Quality Notes</label>
          <textarea
            id="qualityNotes"
            name="qualityNotes"
            rows="4"
            value={formData.qualityNotes}
            onChange={handleChange}
            placeholder="Describe the herb quality, appearance, and any special notes..."
            disabled={isSubmitting}
          ></textarea>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-btn-3d"
            disabled={!account || isSubmitting}
          >
            {isSubmitting ? '⏳ Recording...' : '🌿 Record Collection on Blockchain'}
          </button>
        </div>
      </form>

      <div className="collection-preview">
        <h3>Collection Preview</h3>
        <div className="preview-card-3d">
          <div className="preview-content">
            <div className="preview-item">
              <span className="preview-label">Species:</span>
              <span className="preview-value">{formData.species || 'Not specified'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Weight:</span>
              <span className="preview-value">{formData.weight || '0'} kg</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Location:</span>
              <span className="preview-value">{formData.location || 'Not specified'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Harvest Date:</span>
              <span className="preview-value">{formData.harvestDate || 'Not specified'}</span>
            </div>
            {formData.qualityNotes && (
              <div className="preview-item">
                <span className="preview-label">Quality Notes:</span>
                <span className="preview-value">{formData.qualityNotes}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="blockchain-info">
        <h4>Blockchain Information</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Wallet Address:</span>
            <span className="info-value">{account || 'Not connected'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Network:</span>
            <span className="info-value">Ethereum Mainnet</span>
          </div>
          <div className="info-item">
            <span className="info-label">Transaction Fee:</span>
            <span className="info-value">~$2-5 (estimated)</span>
          </div>
        </div>
      </div>

      <div className="floating-herbs">
        <div className="herb-float">🌿</div>
        <div className="herb-float">🌿</div>
        <div className="herb-float">🌿</div>
      </div>
    </div>
  );
};

export default CollectionEvent;