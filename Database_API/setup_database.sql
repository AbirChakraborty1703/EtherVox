-- =====================================================
-- EtherVox Voting System Database Setup
-- MySQL Workbench Compatible Script
-- =====================================================

-- Create database if it doesn't exist
DROP DATABASE IF EXISTS voter_db;
CREATE DATABASE voter_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE voter_db;

-- =====================================================
-- Create voters table with enhanced security
-- =====================================================
CREATE TABLE voters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voter_id VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    INDEX idx_voter_id (voter_id),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- =====================================================
-- Create voting polls table
-- =====================================================
CREATE TABLE polls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    total_votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES voters(id) ON DELETE CASCADE,
    INDEX idx_active (is_active),
    INDEX idx_dates (start_date, end_date)
);

-- =====================================================
-- Create poll options table
-- =====================================================
CREATE TABLE poll_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    vote_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    INDEX idx_poll_id (poll_id)
);

-- =====================================================
-- Create votes table
-- =====================================================
CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    voter_id INT NOT NULL,
    option_id INT NOT NULL,
    vote_hash VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (poll_id, voter_id),
    INDEX idx_poll_voter (poll_id, voter_id),
    INDEX idx_vote_hash (vote_hash)
);

-- =====================================================
-- Insert default admin users
-- =====================================================
INSERT INTO voters (voter_id, password, role, full_name, email, phone, address) VALUES 
('A001', 'adminPass001', 'admin', 'System Administrator', 'admin@ethervox.com', '+1-555-0001', 'Admin Office, EtherVox HQ'),
('A002', 'adminPass002', 'admin', 'Election Commissioner', 'commissioner@ethervox.com', '+1-555-0002', 'Commissioner Office, EtherVox HQ');

-- =====================================================
-- Insert sample user accounts
-- =====================================================
INSERT INTO voters (voter_id, password, role, full_name, email, phone, address) VALUES 
('U001', 'userPass001', 'user', 'John Doe', 'john.doe@example.com', '+1-555-1001', '123 Main St, Anytown, USA'),
('U002', 'userPass002', 'user', 'Jane Smith', 'jane.smith@example.com', '+1-555-1002', '456 Oak Ave, Somewhere, USA'),
('U003', 'userPass003', 'user', 'Alice Johnson', 'alice.johnson@example.com', '+1-555-1003', '789 Pine Rd, Elsewhere, USA'),
('U004', 'userPass004', 'user', 'Bob Wilson', 'bob.wilson@example.com', '+1-555-1004', '321 Elm St, Nowhere, USA'),
('U005', 'userPass005', 'user', 'Charlie Brown', 'charlie.brown@example.com', '+1-555-1005', '654 Maple Dr, Anywhere, USA');

-- Create voting_sessions table for tracking voting periods
CREATE TABLE IF NOT EXISTS voting_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_name VARCHAR(100) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES voters(voter_id)
);

-- Create votes table for tracking votes (optional, for backup/audit)
CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voter_id VARCHAR(50) NOT NULL,
    candidate_id INT NOT NULL,
    session_id INT,
    vote_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blockchain_tx_hash VARCHAR(66),
    FOREIGN KEY (voter_id) REFERENCES voters(voter_id),
    FOREIGN KEY (session_id) REFERENCES voting_sessions(id),
    UNIQUE KEY unique_voter_session (voter_id, session_id)
);

-- Display created tables
SHOW TABLES;

-- Display sample data
SELECT voter_id, role, full_name FROM voters;

COMMIT;
