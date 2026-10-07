-- Server-side EBS application sessions (express-session + connect-pg-simple).
-- Kept separate from the OAuth2 Proxy gateway session cookie.
CREATE TABLE user_sessions (
    sid    VARCHAR      NOT NULL PRIMARY KEY,
    sess   JSON         NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_user_sessions_expire ON user_sessions (expire);
