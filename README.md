# Express API

A lightweight Express API setup with centralized routes, separate models, and database connectors.

## Folder Structure

```
Express/
├── config/              # Configuration files
│   └── env.js          # Environment variables
├── database/           # Database connectors
│   └── connect.js      # MongoDB connection
├── middleware/         # Custom middleware (optional)
├── models/             # Database models
│   └── User.js         # User model
├── server.js           # Main API file with all routes
├── package.json        # Dependencies
├── .env.example        # Environment template
└── .gitignore
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Update variables as needed

3. **Run Server**
   ```bash
   npm start          # Production
   npm run dev        # Development with nodemon
   ```

# Express Database Explorer API

A lightweight Express API for exploring and managing database connections from any source. Test, confirm, and interact with any database via a unified API interface.

## Features

- ✅ **No Local Database Required** - Explore external databases only
- ✅ Test database connections without storing context
- ✅ Get metadata about any database before confirming
- ✅ Persistent in-memory session management with session IDs
- ✅ Deep schema exploration (tables, columns, relationships, indexes)
- ✅ Support for MongoDB, PostgreSQL, MySQL, Firebase, Supabase, REST APIs
- ✅ Sample data extraction from any source
- ✅ Automatic metadata caching per session

## Folder Structure

```
Express/
├── routes/
│   └── database.js              # Database exploration routes
├── middleware/
│   ├── dbContextManager.js      # In-memory session management
│   └── dbValidation.js          # Context validation middleware
├── database/                    # Database connectors & explorers
│   ├── schemaDetector.js        # DB type detection
│   ├── mongodb.js
│   ├── postgresql.js
│   ├── mysql.js
│   ├── firebase.js
│   ├── supabase.js
│   ├── restapi.js
│   ├── mongoexplorer.js
│   ├── postgresexplorer.js
│   ├── mysqlexplorer.js
│   └── schemaexplorer.js
├── config/
│   └── env.js                   # Environment config
├── models/                      # (Optional) User models if needed
├── server.js                    # Main server file
├── package.json
└── README.md
```

**Note:** No local database is required. All connections are to external data sources provided by the user.

## API Workflow

### Step 1: Test Connection
Test your database connection and get metadata **without** storing context.

```bash
POST /api/database/test
Content-Type: application/json

{
  "connectionString": "postgresql://user:pass@localhost:5432/dbname"
}
```

**Response:**
```json
{
  "success": true,
  "testResult": "passed",
  "metadata": {
    "dbType": "PostgreSQL",
    "tablesCount": 5,
    "schema": { ... },
    "connectionStatus": "connected",
    "timestamp": "2024-01-12T10:30:00Z"
  },
  "nextStep": "Call POST /api/database/confirm to store this connection"
}
```

### Step 2: Confirm Connection
Once you've reviewed the metadata, confirm the connection to create a persistent session.

```bash
POST /api/database/confirm
Content-Type: application/json

{
  "connectionString": "postgresql://user:pass@localhost:5432/dbname"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_1705078200000_1",
  "dbType": "PostgreSQL",
  "metadata": { ... },
  "instructions": {
    "nextSteps": [
      "Use sessionId: session_1705078200000_1",
      "Include header: X-DB-Session: session_1705078200000_1",
      "All subsequent requests will use this context"
    ]
  }
}
```

### Step 3: Use Database Context
All subsequent requests use the stored context via session ID.

**Option A: Header**
```bash
POST /api/database/explore
X-DB-Session: session_1705078200000_1
Content-Type: application/json
```

**Option B: Request Body**
```bash
POST /api/database/explore
Content-Type: application/json

{
  "sessionId": "session_1705078200000_1"
}
```

## API Endpoints

### Connection Management
- `POST /api/database/test` - Test connection and get metadata (no context stored)
- `POST /api/database/confirm` - Confirm connection and create persistent context
- `GET /api/database/context/current` - Get current active context
- `GET /api/database/context/list` - List all active database contexts
- `DELETE /api/database/context/:sessionId` - Close a database context

### Database Operations (require context)
- `POST /api/database/detect` - Get database type from current context
- `POST /api/database/connect` - Get full schema from current context
- `POST /api/database/rest` - Direct REST API call (optional context)
- `POST /api/database/explore` - Complete deep schema exploration
- `POST /api/database/explore/table` - Get specific table/collection details

### Health & Info
- `GET /api/health` - Health check

## Complete Usage Examples

### Example 1: Test PostgreSQL Connection

```bash
# Step 1: Test the connection
curl -X POST http://localhost:5000/api/database/test \
  -H "Content-Type: application/json" \
  -d '{
    "connectionString": "postgresql://user:pass@localhost:5432/mydb"
  }'

# Response includes: dbType, tablesCount, schema metadata
```

### Example 2: Confirm MongoDB and Explore

```bash
# Step 1: Confirm connection
curl -X POST http://localhost:5000/api/database/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "connectionString": "mongodb+srv://user:pass@cluster.mongodb.net/dbname"
  }'

# Response: { "sessionId": "session_1705078200000_1" }

# Step 2: List contexts
curl http://localhost:5000/api/database/context/list

# Step 3: Explore schema with context
curl -X POST http://localhost:5000/api/database/explore \
  -H "X-DB-Session: session_1705078200000_1" \
  -H "Content-Type: application/json"

# Step 4: Get specific table details
curl -X POST http://localhost:5000/api/database/explore/table \
  -H "X-DB-Session: session_1705078200000_1" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "users"
  }'

# Step 5: Close context when done
curl -X DELETE http://localhost:5000/api/database/context/session_1705078200000_1
```

### Example 3: Test & Confirm Supabase

```bash
# Step 1: Test
curl -X POST http://localhost:5000/api/database/test \
  -H "Content-Type: application/json" \
  -d '{
    "connectionString": "https://project.supabase.co",
    "apiKey": "your-supabase-key"
  }'

# Step 2: Confirm
curl -X POST http://localhost:5000/api/database/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "connectionString": "https://project.supabase.co",
    "apiKey": "your-supabase-key"
  }'

# Now use sessionId for all operations
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment** (Optional)
   - Copy `.env.example` to `.env`
   - Customize PORT and NODE_ENV if needed
   - **No database configuration required**

3. **Run Server**
   ```bash
   npm start          # Production
   npm run dev        # Development with nodemon
   ```

The server will start on `http://localhost:5000` and be ready to explore any external database!

## Supported Databases

- **MongoDB** - `mongodb://` or `mongodb+srv://`
- **PostgreSQL** - `postgresql://` or `postgres://`
- **MySQL** - `mysql://` or `mysql2://`
- **Firebase** - `https://projectname.firebaseio.com`
- **Supabase** - `https://projectname.supabase.co` (with API key)
- **REST APIs** - Any HTTP/HTTPS endpoint

## Session Management

Contexts are automatically cleaned up after 24 hours of inactivity. You can manually close contexts using:

```bash
DELETE /api/database/context/:sessionId
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Human-readable message"
}
```

Common errors:
- Missing connection string
- Invalid database credentials
- No active database context
- Session expired or invalid
