-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'client',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create test user
INSERT INTO users (email, password_hash, role, status) 
VALUES ('test@test.com', '$2b$10$rOjXqV3KqKzqKqKzqKqKqOjXqV3KqKzqKqKzqKqKzqKqKzqKqKzqK', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;
