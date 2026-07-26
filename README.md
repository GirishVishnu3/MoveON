# MoveON Platform

## Overview
MoveON is a completely new production-grade ride-hailing platform built with a microservice architecture in mind, scaling with an enterprise-level project structure following Domain Driven Design.

## Architecture
- **Web**: Next.js App Router with Tailwind CSS, Redux, React Query
- **Admin**: Next.js App Router for back-office management
- **Mobile**: React Native using Expo
- **Backend**: FastAPI with Python 3.12+, SQLAlchemy, asyncpg, Redis, Celery
- **Shared**: A shared monorepo package for UI, Types, and Hooks

## Development Workflow
- **Prerequisites**: Node.js (npm workspaces), Python 3.12, Docker
- **Backend Setup**:
  1. `cd backend`
  2. `python -m venv venv`
  3. `source venv/bin/activate`
  4. `pip install -r requirements.txt` (or install manually)
  5. Use Docker to start dependencies: `docker-compose up -d` at root.
- **Frontend Setup**:
  1. `npm install` at root
  2. `npm run dev:web`
  3. `npm run dev:admin`
  4. `npm run dev:mobile`

## Environments
Env files should be managed in the respective app's root folder (`.env`, `.env.development`, `.env.production`). Never commit secrets to the repository!
