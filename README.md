# Content Aggregator Service

A robust backend service built with Node.js, Express, and TypeScript that aggregates technical content from multiple external sources (Hacker News, Dev.to, Reddit, Lobsters) into a unified, searchable feed.

## 🚀 Features

- **Multi-Source Aggregation**: Integrates with 4 major technical content APIs.
- **Dynamic Source Management**: Content sources are managed in the database, allowing for easy expansion without code changes.
- **Unified Schema**: All incoming data is normalized into a consistent internal structure.
- **Background Refresh**: Automated background jobs (via `node-cron`) keep the content fresh independently of user requests.
- **Advanced Filtering & Search**:
  - Filter by source.
  - Case-insensitive search across titles, authors, and summaries.
  - Bookmark/Save articles for later reading.
- **Production Ready**: Layered architecture (Controller, Service, Repository), PostgreSQL integration, and environment-based configuration.

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express (with TypeScript)
- **ORM**: Prisma (using Driver Adapters for PostgreSQL)
- **Database**: PostgreSQL
- **Background Jobs**: node-cron
- **Validation**: Zod
- **Networking**: Axios

## 📦 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository and navigate to the project folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and provide your `DATABASE_URL`.

### Database Setup

1. Run migrations to sync the schema:
   ```bash
   npx prisma db push
   ```
2. **Important**: Seed the database with the initial content sources:
   ```bash
   npx prisma db seed
   ```

### Running the Application

- **Development Mode**:
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm run build
  npm start
  ```

The server will be running on port `6001` (configurable in `.env`).

## 📡 API Endpoints

### Articles
- `GET /api/articles` - Retrieve unified feed.
  - Query Params: `page`, `limit`, `source`, `q` (search), `saved` (true/false)
- `GET /api/articles/:id` - Get a specific article.
- `POST /api/articles/:id/bookmark` - Toggle the saved/bookmark status of an article.

### Sources
- `GET /api/sources` - List all configured content sources.
- `POST /api/sources` - Add a new content source dynamically.

### System
- `POST /api/refresh` - Manually trigger a background refresh of all sources.
- `GET /api/health` - Check service health status.

## 🧠 Design Decisions

### 1. Dynamic Source Architecture
Rather than hardcoding API fetchers, I chose a hybrid approach where source URLs and metadata are stored in the database. This allows for disabling or updating sources (like the Dev.to API URL) without redeploying code, fulfilling the "User Preferences" bonus requirement.

### 2. Driver Adapters (Prisma 7)
I implemented the new Prisma 7 Driver Adapter pattern using `@prisma/adapter-pg`. This ensures the application is compatible with the latest industry standards and provides better connection management.

### 3. Layered Architecture
The project follows a strict separation of concerns:
- **Routes**: Handle HTTP mapping.
- **Controllers**: Handle request/response lifecycle and error catching.
- **Services**: Contain business logic and coordinate fetchers/repositories.
- **Repositories**: Direct database interaction.
- **Fetcher Service**: Handles external API communication and data normalization logic.

### 4. Normalization Strategy
Data from diverse sources (Hacker News' Firebase API vs. Reddit's JSON) is normalized at the edge of the service (in `fetcher.service.ts`). This keeps the rest of the application agnostic to external API changes.

## 📈 Future Improvements
- **Caching**: Implement Redis for the `/articles` endpoint to reduce DB load.
- **Unit Testing**: Add Jest/Supertest coverage for normalization logic and API endpoints.
- **Frontend Integration**: Build the companion React application to consume this API.
- **Rate Limiting**: Implement more robust exponential backoff for APIs like Lobsters which are prone to `429` errors.

## 📝 Assumptions
- We assume the PostgreSQL database is locally accessible or correctly configured in the `.env`.
- The `node-cron` job is set to run every 4 hours to respect rate limits of public APIs while keeping content fresh, explicitly handling 429 errors and executing a 14-day data retention cleanup policy.

## 🤖 AI Usage Policy
*Please update this to reflect your usage:*
I utilized an AI-powered coding assistant to help scaffold the Express boilerplate, design the layered TypeScript architecture, construct the MongoDB/PostgreSQL database schema via Prisma, and write the regex/normalization logic for data cleanup. I guided the architectural decisions, comprehensively reviewed all generated code logic, verified its behavior locally, and am fully comfortable explaining and defending the functionality of this service.
