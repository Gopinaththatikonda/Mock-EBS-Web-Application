-- EBS application users (Layer 2: EBS application login).
-- Identifiers are normalised by the application before insert:
--   username/email -> lower case, employee_id -> upper case.
CREATE TABLE users (
    id            BIGSERIAL     PRIMARY KEY,
    full_name     VARCHAR(100)  NOT NULL,
    employee_id   VARCHAR(20)   NOT NULL,
    email         VARCHAR(254)  NOT NULL,
    mobile        VARCHAR(15)   NOT NULL,
    username      VARCHAR(30)   NOT NULL,
    password_hash VARCHAR(100)  NOT NULL,
    role          VARCHAR(20)   NOT NULL DEFAULT 'user',
    status        VARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_login    TIMESTAMPTZ,

    CONSTRAINT users_username_key    UNIQUE (username),
    CONSTRAINT users_email_key       UNIQUE (email),
    CONSTRAINT users_employee_id_key UNIQUE (employee_id),
    CONSTRAINT users_role_check      CHECK (role IN ('user', 'admin')),
    CONSTRAINT users_status_check    CHECK (status IN ('active', 'inactive', 'locked'))
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
