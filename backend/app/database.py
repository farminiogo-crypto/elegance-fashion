from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:password@localhost:3306/fashion_db"
)

# Create engine with connection error handling
# For MySQL, set shorter timeout to prevent hanging
mysql_connect_args = {}
if "mysql" in DATABASE_URL:
    mysql_connect_args = {
        "connect_timeout": 3,  # 3 second timeout
        "read_timeout": 5,      # 5 second read timeout
        "write_timeout": 5,     # 5 second write timeout
    }

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=5,  # Timeout for getting connection from pool
    echo=False,  # Set to True for SQL query logging
    connect_args=mysql_connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.close()
        print(f"Database connection error: {e}")
        raise
    finally:
        db.close()

