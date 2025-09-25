# Supply Chain Traceability Backend - SIH PS 25027

A comprehensive blockchain-based supply chain traceability system built for Smart India Hackathon Problem Statement 25027.

## 🏗️ Architecture Overview

This backend system provides:
- **JWT-based Authentication** with role-based access control
- **Mock Blockchain Integration** (ready for Hyperledger Fabric)
- **File Storage System** for certificates and photos
- **GPS Geofencing** for location validation
- **Comprehensive Audit Logging**
- **RESTful API** with proper error handling
- **PostgreSQL Database** with optimized schema

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Quick Start

1. **Clone and Install Dependencies**
```bash
git clone <repository>
cd supply-chain-backend
npm install
```

2. **Database Setup**
```bash
# Create PostgreSQL database
createdb supply_chain_db

# Or use the automated setup script
node scripts/setup.js
```

3. **Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supply_chain_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-256-bit-secret-key
```

4. **Start the Application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on http://localhost:3000

## 👥 Default User Accounts

The system creates these test accounts automatically:

| Role | Username | Email | Password |
|------|----------|--------|----------|
| Admin | admin | admin@supplychain.com | admin123 |
| Collector | farmer1 | farmer1@test.com | password123 |
| Lab | lab1 | lab1@test.com | password123 |
| Processor | processor1 | processor1@test.com | password123 |
| Manufacturer | manufacturer1 | manufacturer1@test.com | password123 |
| Consumer | consumer1 | consumer1@test.com | password123 |

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/login          - User login
POST /api/auth/register       - User registration (Admin only)
POST /api/auth/refresh        - Token refresh
POST /api/auth/logout         - User logout
GET  /api/auth/profile        - Get user profile
```

### Core Transaction Endpoints
```
POST /api/collection-event    - Submit harvest data (Collector)
POST /api/quality-test        - Submit lab results (Lab)
POST /api/processing-step     - Record processing (Processor)
POST /api/product-batch       - Create final product (Manufacturer)
```

### Query Endpoints
```
GET /api/provenance/{batchId}     - Full provenance history (Public)
GET /api/batch/{batchId}/status   - Current batch status
GET /api/collector/{id}/events    - Collector's events
GET /api/stats/harvest-volumes    - Harvest statistics (Admin)
GET /api/search/batches           - Search batches with filters
```

### File Handling
```
POST /api/upload/certificate      - Upload lab certificates
POST /api/upload/collection-photo - Upload harvest photos
GET  /api/files/{fileHash}        - Retrieve stored files
```

### Admin Endpoints
```
GET /api/admin/metrics           - System metrics
GET /api/admin/users             - User management
PUT /api/admin/users/{id}/status - Update user status
GET /api/admin/geofences         - Manage geofences
POST /api/admin/geofences        - Create geofence
GET /api/admin/audit-logs        - Audit trail
```

## 🔐 Security Features

- **JWT Authentication** with session management
- **Role-based Authorization** (6 user roles)
- **Input Validation** and SQL injection prevention
- **File Upload Security** with type validation
- **Rate Limiting** to prevent API abuse
- **HTTPS Enforcement** and CORS configuration
- **Comprehensive Audit Logging**

## 🗄️ Database Schema

Key tables:
- `users` - User accounts and profiles
- `audit_logs` - System activity tracking
- `file_metadata` - Uploaded file information
- `sessions` - JWT token management
- `geofences` - GPS boundary definitions
- `blockchain_transactions` - Transaction history

## 🔗 Blockchain Integration

Currently uses a mock blockchain service for demonstration. Production deployment should integrate with:
- **Hyperledger Fabric** for enterprise blockchain
- **Smart Contracts** for automated validation
- **Event Listeners** for real-time updates

## 📁 Project Structure

```
supply-chain-backend/
├── server.js                 # Main application server
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── errorHandler.js      # Global error handling
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── transactions.js      # Transaction submission
│   ├── queries.js           # Data retrieval
│   ├── admin.js             # Administrative functions
│   └── files.js             # File upload/download
├── services/
│   ├── blockchainService.js # Blockchain integration
│   ├── auditService.js      # Audit logging
│   ├── gpsService.js        # GPS validation
│   └── fileService.js       # File management
├── scripts/
│   └── setup.js             # Database setup
├── uploads/                 # File storage directory
└── public/                  # Test frontend files
```

## 🧪 Testing

The system includes a basic web interface for testing all endpoints:
- Visit http://localhost:3000 after starting the server
- Login with any test account
- Test all major functionalities through the UI

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**
   - Use strong, random JWT secrets
   - Configure proper database credentials
   - Set NODE_ENV=production

2. **Database**
   - Use connection pooling
   - Implement regular backups
   - Monitor performance metrics

3. **File Storage**
   - Consider cloud storage (AWS S3, etc.)
   - Implement CDN for file delivery
   - Set up automated backups

4. **Security**
   - Use HTTPS in production
   - Implement proper CORS policies
   - Regular security audits

5. **Monitoring**
   - Set up application monitoring
   - Configure log aggregation
   - Implement health checks

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📞 Support

For questions and support, please contact the development team or create an issue in the repository.