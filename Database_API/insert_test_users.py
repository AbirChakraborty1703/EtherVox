"""
Quick script to insert test users into voter_db
"""
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

try:
    # Connect to MySQL
    connection = mysql.connector.connect(
        host=os.environ.get('MYSQL_HOST', 'localhost'),
        port=int(os.environ.get('MYSQL_PORT', '3306')),
        user=os.environ.get('MYSQL_USER', 'root'),
        password=os.environ.get('MYSQL_PASSWORD', ''),
        database='voter_db'
    )
    
    cursor = connection.cursor()
    
    # Insert test users
    sql = """
    INSERT INTO voters (voter_id, password, role) 
    VALUES (%s, %s, %s)
    ON DUPLICATE KEY UPDATE 
      password = VALUES(password),
      role = VALUES(role)
    """
    
    users = [
        ('A001', 'adminPass001', 'admin'),
        ('U001', 'userPass001', 'user')
    ]
    
    cursor.executemany(sql, users)
    connection.commit()
    
    # Verify
    cursor.execute("SELECT voter_id, role FROM voters")
    results = cursor.fetchall()
    
    print("[OK] Users inserted successfully!")
    print("Available users:")
    for user in results:
        print(f"  - {user[0]} ({user[1]})")
    
    cursor.close()
    connection.close()
    
except Exception as e:
    print(f"[ERROR] Failed to insert users: {e}")
