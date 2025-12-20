USE voter_db;

INSERT INTO voters (voter_id, password, role) 
VALUES 
  ('A001', 'adminPass001', 'admin'),
  ('U001', 'userPass001', 'user')
ON DUPLICATE KEY UPDATE 
  password = VALUES(password),
  role = VALUES(role);

SELECT voter_id, role FROM voters;
