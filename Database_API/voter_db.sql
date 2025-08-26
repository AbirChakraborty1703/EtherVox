DROP DATABASE IF EXISTS voter_db;
CREATE DATABASE voter_db;
USE voter_db;

-- Create the voters table
CREATE TABLE voters (
    voter_id CHAR(5) PRIMARY KEY NOT NULL,
    role VARCHAR(5) NOT NULL,
    password VARCHAR(255) NOT NULL,
    CONSTRAINT check_role CHECK (role IN ('admin', 'user')),
    CONSTRAINT unique_password UNIQUE (password)
);

-- Insert 50 sample rows: 2 admins + 48 users
INSERT INTO voters (voter_id, role, password) VALUES
-- Admins (2)
('A001', 'admin', 'adminPass001'),

-- Users (48 unique)
('U001', 'user', 'userPass001'),
('U002', 'user', 'userPass002'),
('U003', 'user', 'userPass003'),
('U004', 'user', 'userPass004'),
('U005', 'user', 'userPass005'),
('U006', 'user', 'userPass006'),
('U007', 'user', 'userPass007'),
('U008', 'user', 'userPass008'),
('U009', 'user', 'userPass009'),
('U010', 'user', 'userPass010'),

('U011', 'user', 'userPass011'),
('U012', 'user', 'userPass012'),
('U013', 'user', 'userPass013'),
('U014', 'user', 'userPass014'),
('U015', 'user', 'userPass015'),
('U016', 'user', 'userPass016'),
('U017', 'user', 'userPass017'),
('U018', 'user', 'userPass018'),
('U019', 'user', 'userPass019'),
('U020', 'user', 'userPass020'),

('U021', 'user', 'userPass021'),
('U022', 'user', 'userPass022'),
('U023', 'user', 'userPass023'),
('U024', 'user', 'userPass024'),
('U025', 'user', 'userPass025'),
('U026', 'user', 'userPass026'),
('U027', 'user', 'userPass027'),
('U028', 'user', 'userPass028'),
('U029', 'user', 'userPass029'),
('U030', 'user', 'userPass030'),

('U031', 'user', 'userPass031'),
('U032', 'user', 'userPass032'),
('U033', 'user', 'userPass033'),
('U034', 'user', 'userPass034'),
('U035', 'user', 'userPass035'),
('U036', 'user', 'userPass036'),
('U037', 'user', 'userPass037'),
('U038', 'user', 'userPass038'),
('U039', 'user', 'userPass039'),
('U040', 'user', 'userPass040'),

('U041', 'user', 'userPass041'),
('U042', 'user', 'userPass042'),
('U043', 'user', 'userPass043'),
('U044', 'user', 'userPass044'),
('U045', 'user', 'userPass045'),
('U046', 'user', 'userPass046'),
('U047', 'user', 'userPass047');

SELECT * FROM voters;