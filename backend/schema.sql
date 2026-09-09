-- PostgreSQL schema for TripExpCal
-- Prefer Alembic migrations in production:
--   cd backend && alembic upgrade head
--
-- This file is a readable reference of the initial schema.

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY,
    public_id VARCHAR(12) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_trips_public_id ON trips (public_id);

CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_member_trip_name UNIQUE (trip_id, name)
);

CREATE INDEX IF NOT EXISTS ix_members_trip_id ON members (trip_id);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    paid_by_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    category VARCHAR(50) NOT NULL,
    expense_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_expenses_trip_id ON expenses (trip_id);
