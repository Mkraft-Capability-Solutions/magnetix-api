-- Client-side auth/permission failure log.
-- Written by the frontend circuit breaker so support can inspect what
-- happened after a user is auto-signed-out. Kept lean and append-only.

CREATE TABLE IF NOT EXISTS client_error_log (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  event_time       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  reason           VARCHAR(64)  NOT NULL,            -- e.g. 'permission_circuit_breaker', 'auth_403'
  http_method      VARCHAR(10)  NULL,
  http_url         VARCHAR(500) NULL,
  http_status      INT          NULL,
  server_message   VARCHAR(500) NULL,
  user_id          VARCHAR(36)  NULL,
  user_email       VARCHAR(255) NULL,
  user_role        VARCHAR(32)  NULL,
  current_path     VARCHAR(500) NULL,
  user_agent       VARCHAR(500) NULL,
  consecutive_count INT         NULL,
  extra            JSON         NULL,
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cel_time       (event_time),
  INDEX idx_cel_user       (user_id),
  INDEX idx_cel_reason     (reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
