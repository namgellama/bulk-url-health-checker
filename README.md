# Bulk URL Health Checker

A full-stack URL health checking application that processes URLs asynchronously using BullMQ and Redis, persists results in PostgreSQL, and provides real-time progress updates through Server-Sent Events (SSE).

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- TanStack Query
- Tailwind CSS

### Backend

- Fastify
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Server-Sent Events (SSE)

---

# Prerequisites

Make sure the following are installed:

- Node.js 20+
- npm
- PostgreSQL
- Docker
- Redis

PostgreSQL runs **locally** on the host machine.

Redis runs using Docker.

---

# Environment Variables

Create a `.env` file inside the `server` directory:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME"
REDIS_URL="redis://localhost:6379"
PORT=8000
```

Create a `.env.local` file inside the `client` directory:

```env
NEXT_PUBLIC_API_URL="http://localhost:8000/api"
```

Replace the PostgreSQL credentials and database name with your local configuration.

---

# Installation

Clone the repository and install dependencies for both applications.

```bash
git clone <repository-url>
cd <repository-directory>
```

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd ../client
npm install
```

---

# Database Setup

Make sure PostgreSQL is running locally and the database specified in `DATABASE_URL` exists.

From the `server` directory, run:

```bash
npx prisma migrate dev
```

Then generate the Prisma client:

```bash
npx prisma generate
```

---

# Start Redis

Redis is required by BullMQ.

Run Redis using Docker:

```bash
docker run -d --name url-checker-redis -p 6379:6379 redis:7-alpine
```

If the container already exists, start it with:

```bash
docker start url-checker-redis
```

You can verify that Redis is running with:

```bash
docker ps
```

---

# Run the Application

The application consists of three processes:

1. PostgreSQL — local database
2. Backend API + BullMQ worker
3. Next.js frontend

## Start Backend

From the `server` directory:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:8000
```

## Start Frontend

Open another terminal:

```bash
cd client
npm run dev
```

The frontend runs on:

```text
http://localhost:3000
```

The BullMQ worker runs as part of the backend process.

---

# Exact Commands to Run the System

After PostgreSQL is running locally, the minimum setup is:

### Terminal 1 — Redis

```bash
docker start url-checker-redis
```

Or, if Redis has not been created yet:

```bash
docker run -d --name url-checker-redis -p 6379:6379 redis:7-alpine
```

### Terminal 2 — Backend

```bash
cd server
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

### Terminal 3 — Frontend

```bash
cd client
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

### Terminal 4 — BullMQ Worker

cd server
npm run worker

---

# Architecture Overview

```text
                    ┌──────────────────┐
                    │    Next.js UI    │
                    │   localhost:3000  │
                    └────────┬─────────┘
                             │
                    REST API │ SSE
                             │
                             ▼
                    ┌──────────────────┐
                    │   Fastify API    │
                    │   localhost:8000 │
                    └───────┬──────┬───┘
                            │      │
                    Prisma  │      │ BullMQ
                            │      │
                            ▼      ▼
                    ┌──────────┐  ┌──────────┐
                    │PostgreSQL│  │  Redis   │
                    │  Local   │  │  Docker  │
                    └──────────┘  └────┬─────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │ BullMQ Worker│
                                │ URL Checker  │
                                └──────┬──────┘
                                       │
                                       │ publish events
                                       ▼
                                  Redis Pub/Sub
                                       │
                                       ▼
                                  SSE Clients
```

## Request Flow

### Creating a batch

1. User submits URLs manually or through CSV.
2. Frontend sends the URLs to the Fastify API.
3. API creates the batch and URL records in PostgreSQL.
4. Jobs are added to the BullMQ queue.
5. Worker processes URLs asynchronously.
6. Results are persisted in PostgreSQL.
7. Worker publishes URL and batch events through Redis Pub/Sub.
8. The API's SSE connection forwards those events to the browser.
9. The frontend updates the batch without requiring a page refresh.

### Batch page

When a batch page is opened:

1. The frontend fetches the current batch from PostgreSQL through the REST API.
2. The frontend opens an SSE connection.
3. The backend sends an initial snapshot.
4. Subsequent URL and batch updates are pushed through SSE.
5. If the browser refreshes, the current database state is fetched again.
6. Therefore, the page does not depend on previous client state.

---

# Live Updates

Server-Sent Events (SSE) are used for real-time batch updates.

Two event types are published:

```text
url_updated
batch_updated
```

Example:

```json
{
    "type": "url_updated",
    "urlId": "...",
    "status": "success",
    "httpStatus": 200,
    "responseTimeMs": 283
}
```

And:

```json
{
    "type": "batch_updated",
    "batch": {
        "id": "...",
        "status": "running",
        "totalCount": 10,
        "completedCount": 4,
        "successCount": 4,
        "failedCount": 0
    }
}
```

The SSE connection also sends periodic heartbeats to prevent idle connections from being closed.

The browser automatically attempts to reconnect when an SSE connection is lost.

---

# Retry Strategy

BullMQ jobs use automatic retries:

```text
attempts: 3
backoff: exponential
```

A failed URL is retried without marking the URL permanently failed until the final attempt.

For example:

```text
Attempt 1 → failed
Attempt 2 → failed
Attempt 3 → failed
                 ↓
              failed
```

If an attempt succeeds, the URL becomes `success` and no additional attempts are performed.

---

# Retry Failed URLs

The application also supports manually retrying URLs that ended in the `failed` state.

Only failed URLs are selected.

Successful URLs are not reprocessed.

When retrying:

```text
failed → queued
```

A new BullMQ job is created for each failed URL.

The URL's `jobVersion` is incremented to prevent an old/stale job from modifying the URL.

---

# Idempotency and Stale Jobs

Each URL has a `jobVersion`.

A BullMQ job contains the version that was current when the job was created.

Before processing a URL, the worker verifies that the job version still matches the database.

This prevents stale jobs from modifying a URL after operations such as:

- cancellation
- retrying a failed URL
- re-queuing work

Database updates also use the version as a guard.

For example:

```text
WHERE id = urlId
AND jobVersion = expectedVersion
```

This ensures that an outdated worker cannot overwrite newer state.

---

# Cancellation

A batch can be cancelled while jobs are:

- queued
- waiting for execution
- already being processed

When a batch is cancelled:

```text
Batch:
running → cancelled
```

Queued/checking URLs are marked:

```text
queued/checking → cancelled
```

The worker checks the database before doing work.

An in-flight request cannot always be stopped immediately, but its result is ignored if the URL has already been cancelled.

Therefore, a cancelled batch cannot later become completed because of an old worker result.

---

# Refresh Safety

The batch page does not rely only on client-side state.

When the page loads, it requests the current batch from the backend.

The backend retrieves the current state from PostgreSQL.

The SSE endpoint also sends an initial snapshot.

Therefore:

```text
New tab
   ↓
GET /batches/:id
   ↓
Current PostgreSQL state
   ↓
Correct UI
   ↓
SSE connection
   ↓
Live updates
```

Refreshing the page during a running batch does not lose progress.

---

# Horizontal Scaling

The API can be scaled horizontally.

For example:

```text
                 Load Balancer
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      API #1         API #2       API #3
          │            │            │
          └────────────┼────────────┘
                       │
              Redis Pub/Sub
                       │
                 PostgreSQL
```

SSE connections may be established with different API instances.

Redis Pub/Sub acts as the shared event transport between API instances.

For example:

```text
Worker
  │
  │ publish
  ▼
Redis Pub/Sub
  │
  ├──────► API #1 ──────► SSE Client A
  │
  ├──────► API #2 ──────► SSE Client B
  │
  └──────► API #3 ──────► SSE Client C
```

This means an event does not depend on the worker and SSE client being connected to the same API process.

PostgreSQL remains the source of truth for persistent state.

Redis is used for:

- BullMQ queues
- Pub/Sub for live events
- cache invalidation

---

# Trade-offs

## SSE instead of WebSockets

SSE was chosen because the communication is primarily server-to-client.

The browser only needs to receive updates from the server.

Advantages:

- Simple browser API
- Automatic reconnection
- HTTP-based
- Easy to integrate with Fastify
- No need for bidirectional communication

WebSockets would be more appropriate if the application required continuous two-way communication.

---

## Redis Pub/Sub

Redis Pub/Sub provides a simple way to distribute events between multiple API instances.

The trade-off is that Pub/Sub messages are not durable.

If an API instance is disconnected when an event is published, it does not receive that historical event.

This is acceptable because PostgreSQL remains the source of truth and the frontend can fetch the latest batch state after reconnecting or refreshing.

---

## PostgreSQL as the source of truth

All important batch and URL state is stored in PostgreSQL.

Redis is used for transient messaging and job processing rather than being the authoritative source of application state.

This makes refreshes and recovery safer.

---

## BullMQ

BullMQ was chosen to handle:

- asynchronous URL processing
- concurrency
- retries
- exponential backoff
- job state

This keeps URL checking out of the HTTP request lifecycle.

---

# What I Would Improve With More Time

With more time, I would improve:

- Add stronger SSE reconnect handling using event IDs.
- Add Redis Pub/Sub connection monitoring and recovery.
- Add structured logging.
- Add graceful shutdown handling for workers and SSE connections.
- Add Docker Compose or another deployment configuration for easier production setup.
- Add authentication and authorization if the application were exposed publicly.
- Add rate limiting and stricter URL validation/SSRF protection.
- Improve CSV validation and provide row-level validation errors.
- Add observability/metrics for queue depth, processing time, failures, and worker health.

---

# Project Structure

```text
.
├── client/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── apis/
│   └── types/
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── workers/
│   │   ├── pub-sub/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── types/
│   │
│   └── prisma/
│       └── schema.prisma
│
└── README.md
```

---

# Summary

The application separates synchronous API operations from asynchronous URL processing.

- **Fastify** handles HTTP requests and SSE connections.
- **PostgreSQL** stores persistent batch and URL state.
- **BullMQ + Redis** process URL checks asynchronously.
- **Redis Pub/Sub** distributes live events across API instances.
- **SSE** delivers live updates to connected browsers.
- **jobVersion** protects against stale and duplicate jobs.
- **PostgreSQL** provides refresh-safe and consistent state.
- **Cancellation** prevents queued and in-flight jobs from changing cancelled URLs.
- **Retry failed** only reprocesses URLs that actually failed.
