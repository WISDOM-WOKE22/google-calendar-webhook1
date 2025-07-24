-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start_datetime" TEXT,
    "end_datetime" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "timezone" TEXT,
    "status" TEXT,
    "html_link" TEXT,
    "created" TEXT NOT NULL,
    "updated" TEXT NOT NULL,
    "deleted_at" TEXT
);

-- CreateTable
CREATE TABLE "fetch_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscription_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_uri" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiration" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "created" TEXT NOT NULL,
    "updated" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_event_id_key" ON "calendar_events"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "fetch_cache_start_time_end_time_key" ON "fetch_cache"("start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_subscriptions_subscription_id_key" ON "webhook_subscriptions"("subscription_id");
