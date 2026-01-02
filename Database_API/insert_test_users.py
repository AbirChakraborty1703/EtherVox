"""
EtherVox MySQL Database Setup Script
Creates voters table and inserts test users
"""

import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MySQL connection configuration
config = {
    'user': os.environ.get('MYSQL_USER', 'root'),
    'password': os.environ.get('MYSQL_PASSWORD', ''),
    'host': os.environ.get('MYSQL_HOST', 'localhost'),
    'port': int(os.environ.get('MYSQL_PORT', '3306')),
}

database_name = os.environ.get('MYSQL_DB', 'ethervox_voting')

try:
    # Connect to MySQL server (without database)
    print("Connecting to MySQL server...")
    cnx = mysql.connector.connect(**config)
    cursor = cnx.cursor()
    
    # Create database if it doesn't exist
    print(f"Creating database '{database_name}' if not exists...")
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database_name}")
    cursor.execute(f"USE {database_name}")
    
    # Create voters table if it doesn't exist
    print("Creating voters table...")
    create_table_query = """
    CREATE TABLE IF NOT EXISTS voters (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'voter') DEFAULT 'voter',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    cursor.execute(create_table_query)
    
    # Check if test users already exist
    cursor.execute("SELECT COUNT(*) FROM voters")
    count = cursor.fetchone()[0]
    
    if count == 0:
        print("Inserting test users...")
        
        # Test admin user (ID starts with 'A')
        test_users = [
            ('A001', 'Admin User', 'admin@ethervox.com', 'admin123', 'admin'),
            ('V001', 'Test Voter 1', 'voter1@ethervox.com', 'voter123', 'voter'),
            ('V002', 'Test Voter 2', 'voter2@ethervox.com', 'voter123', 'voter'),
        ]
        
        insert_query = """
        INSERT INTO voters (id, name, email, password, role)
        VALUES (%s, %s, %s, %s, %s)
        """
        
        cursor.executemany(insert_query, test_users)
        cnx.commit()
        print(f"✅ Successfully inserted {cursor.rowcount} test users")
    else:
        print(f"✅ Database already has {count} users - skipping insertion")
    
    print("\n" + "="*50)
    print("MySQL Database Setup Completed Successfully!")
    print("="*50)
    print(f"Database: {database_name}")
    print(f"Total users: {count if count > 0 else 3}")
    print("\nTest Admin Login:")
    print("  ID: A001")
    print("  Password: admin123")
    print("\nTest Voter Login:")
    print("  ID: V001 or V002")
    print("  Password: voter123")
    print("="*50)
    
except mysql.connector.Error as err:
    print(f"\n❌ MySQL Error: {err}")
    print("\nTroubleshooting:")
    print("1. Make sure MySQL server is running")
    print("2. Check your .env file for correct credentials")
    print("3. Verify MySQL user has CREATE DATABASE permission")
    exit(1)
    
except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    exit(1)
    
finally:
    if 'cursor' in locals():
        cursor.close()
    if 'cnx' in locals():
        cnx.close()
        print("\nMySQL connection closed.")
