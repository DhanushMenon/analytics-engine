# Unified Event Analytics Engine

Scalable backend for web/mobile analytics with API key management, event collection, and real-time insights.

## Live URL
[https://analytics-engine-8isx.onrender.com](https://analytics-engine-8isx.onrender.com)

## Swagger Docs
[https://analytics-engine-8isx.onrender.com/api-docs](https://analytics-engine-8isx.onrender.com/api-docs)

## Features
- API Key Management (`register`, `api-key`, `revoke`)
- Event Collection with `x-api-key` header
- Analytics: Event Summary & User Stats
- Rate Limiting (100 req/min)
- PostgreSQL + Supavisor Session Mode
- Docker + Render Deployment

## Endpoints
| Method | Endpoint | Description |
|-------|----------|-----------|
| POST | `/api/auth/register` | Register app |
| GET | `/api/auth/api-key` | Get API key |
| POST | `/api/auth/revoke` | Revoke key |
| POST | `/api/analytics/collect` | Submit event |
| GET | `/api/analytics/event-summary` | Event stats |
| GET | `/api/analytics/user-stats` | User stats |


## Architecture
- **Node.js + Express**: Fast, lightweight
- **PostgreSQL**: ACID compliance, JSONB for metadata
- **Supavisor Session Mode**: IPv4 compatibility on Render
- **Rate Limiting**: Prevent abuse
- **Docker**: Portability

## Future Enhancements
- Redis caching for `/event-summary`
- WebSocket real-time dashboard
- Google OAuth for `/register`
- Event deduplication
- Click heatmap storage

## Local Setup
```bash
npm install
node index.js