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
  const [isLocationAutoFilled, setIsLocationAutoFilled] = useState(false);
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

      const signature = await signer.signMessage(JSON.stringify(batchData));
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
        
        setFormData({
          species: '',
          weight: '',
          location: '',
          harvestDate: '',
          qualityNotes: '',
          geoLat: '',
          geoLong: ''
        });
        setIsLocationAutoFilled(false);
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
    // Only allow changes to fields that are not location-related when auto-filled
    if (isLocationAutoFilled && ['location', 'geoLat', 'geoLong'].includes(e.target.name)) {
      return; // Prevent changes to location fields when auto-filled
    }
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
          setIsLocationAutoFilled(true);
        },
        (error) => {
          console.error('Error getting location:', error);
          showNotification({
            type: 'error',
            title: 'Location Error',
            message: 'Could not retrieve your location. Please try again.'
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

      <div className="form-layout">
        <form onSubmit={handleSubmit} className="collection-form">
          <div className="form-section">
            <h3>Collection Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="species">Herb Species *</label>
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

              <div className="form-group">
                <label htmlFor="weight">Weight (kg) *</label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
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
                  type="date"
                  id="harvestDate"
                  name="harvestDate"
                  value={formData.harvestDate}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group location-group">
                <label htmlFor="location">GPS Location *</label>
                <div className="location-inputs">
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    placeholder="Click 'Get Location' to auto-detect"
                    disabled={true} // Always disabled - can only be set by Get Location button
                    readOnly={true}
                    className={isLocationAutoFilled ? 'location-auto-filled' : ''}
                  />
                  <button 
                    type="button" 
                    className="gps-btn"
                    onClick={getCurrentLocation}
                    disabled={isSubmitting || isLocationAutoFilled}
                  >
                    📍 Get Location
                  </button>
                </div>
                <div className="coordinates">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (auto-detected)"
                    value={formData.geoLat}
                    onChange={handleChange}
                    disabled={true} // Always disabled - can only be set by Get Location button
                    readOnly={true}
                    className={isLocationAutoFilled ? 'location-auto-filled' : ''}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (auto-detected)"
                    value={formData.geoLong}
                    onChange={handleChange}
                    disabled={true} // Always disabled - can only be set by Get Location button
                    readOnly={true}
                    className={isLocationAutoFilled ? 'location-auto-filled' : ''}
                  />
                </div>
                {isLocationAutoFilled && (
                  <div className="location-note">
                    <small>✅ Location successfully auto-detected and locked</small>
                  </div>
                )}
                {!isLocationAutoFilled && (
                  <div className="location-note">
                    <small>📍 Location is required. Click "Get Location" to auto-detect your current position.</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Quality Notes</h3>
            <div className="form-group">
              <label htmlFor="qualityNotes">Additional Information</label>
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
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={!account || isSubmitting || !isLocationAutoFilled} // Also disable if location not set
            >
              {isSubmitting ? '⏳ Recording...' : '🌿 Record Collection on Blockchain'}
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
              <span>Species:</span>
              <strong>{formData.species || 'Not specified'}</strong>
            </div>
            <div className="preview-item">
              <span>Weight:</span>
              <strong>{formData.weight || '0'} kg</strong>
            </div>
            <div className="preview-item">
              <span>Location:</span>
              <strong>{formData.location || 'Not specified'}</strong>
            </div>
            <div className="preview-item">
              <span>Harvest Date:</span>
              <strong>{formData.harvestDate || 'Not specified'}</strong>
            </div>
            {formData.qualityNotes && (
              <div className="preview-item">
                <span>Quality Notes:</span>
                <div className="notes-preview">{formData.qualityNotes}</div>
              </div>
            )}
          </div>

          <div className="blockchain-info">
            <h4>Blockchain Status</h4>
            <div className="info-item">
              <span>Wallet:</span>
              <span className={account ? 'status-connected' : 'status-disconnected'}>
                {account ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div className="info-item">
              <span>Network:</span>
              <span>Ethereum Mainnet</span>
            </div>
            <div className="info-item">
              <span>Gas Fee:</span>
              <span>~$2-5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionEvent;