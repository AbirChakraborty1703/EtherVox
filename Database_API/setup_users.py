"""
EtherVox Database Setup Script
Initializes MySQL database with voter data
"""

import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    try:
        # First connect without specifying database to create it
        connection = mysql.connector.connect(
            host=os.environ.get('MYSQL_HOST', 'localhost'),
            port=int(os.environ.get('MYSQL_PORT', '3306')),
            user=os.environ.get('MYSQL_USER', 'root'),
            password=os.environ.get('MYSQL_PASSWORD', '')
        )
        
        cursor = connection.cursor()
        
        print("[SETUP] Setting up MySQL database...")
        
        # Read and execute SQL file
        with open('voter_db.sql', 'r') as sql_file:
            sql_script = sql_file.read()
            
        # Split and execute SQL statements
        for statement in sql_script.split(';'):
            if statement.strip():
                cursor.execute(statement)
        
        connection.commit()
        print("[OK] Database setup completed successfully!")
        print(f"Database: {os.environ.get('MYSQL_DB', 'voter_db')}")
        print("Test admin login: A001 / adminPass001")
        print("Test user login: U001 / userPass001")
        
    except mysql.connector.Error as err:
        print(f"[ERROR] Database setup failed: {err}")
        print("Please check your MySQL installation and credentials in .env file")
        
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    setup_database()
