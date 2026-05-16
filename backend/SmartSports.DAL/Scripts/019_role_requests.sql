CREATE TABLE role_requests (
    id               SERIAL PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_role   VARCHAR(50) NOT NULL,
    status           SMALLINT NOT NULL DEFAULT 0,
    rejection_reason TEXT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at     TIMESTAMPTZ NULL,
    processed_by     INT NULL REFERENCES users(id)
);

-- Prevent duplicate pending requests for the same role per user
CREATE UNIQUE INDEX idx_role_requests_pending_unique
    ON role_requests(user_id, requested_role)
    WHERE status = 0;

CREATE INDEX idx_role_requests_status ON role_requests(status) WHERE status = 0;
