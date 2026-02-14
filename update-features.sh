#!/bin/bash

echo "🚀 MBA Platform - Feature Update Script"
echo "========================================"
echo ""
echo "This will add:"
echo "  ✅ User Authentication (Login/Signup)"
echo "  ✅ Essay Version History"
echo "  ✅ Side-by-Side Review View"
echo ""
echo "Make sure you're in the mba-platform directory!"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "Please run this script from your mba-platform directory"
    echo ""
    echo "Example:"
    echo "  cd mba-platform"
    echo "  bash update-features.sh"
    exit 1
fi

read -p "Continue with update? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Update cancelled."
    exit 1
fi

echo ""
echo "📦 Backing up current files..."
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r backend "$BACKUP_DIR/"
cp -r frontend "$BACKUP_DIR/"
echo "✅ Backup created in $BACKUP_DIR/"
echo ""

echo "📝 Updating backend files..."

# =============================================================================
# BACKEND UPDATES
# =============================================================================

# Update backend/requirements.txt - add JWT dependencies
cat > "backend/requirements.txt" << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
anthropic==0.7.8
python-dotenv==1.0.0
bcrypt==4.1.1
EOF

# Create new auth.py file for authentication logic
cat > "backend/auth.py" << 'EOF'
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User

# JWT Configuration
SECRET_KEY = "your-secret-key-change-in-production"  # In production, use env variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user"""
    token = credentials.credentials
    payload = decode_token(token)
    user_id: int = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


# Optional: Make authentication optional for some routes
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
EOF

# Update models.py - add version tracking to Essay model
cat > "backend/models.py" << 'EOF'
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    essays = relationship("Essay", back_populates="user")


class Essay(Base):
    __tablename__ = "essays"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    school_name = Column(String, index=True)
    program_type = Column(String)
    essay_prompt = Column(Text)
    essay_content = Column(Text)
    ai_review = Column(Text, nullable=True)
    review_score = Column(Float, nullable=True)
    
    # Version tracking
    version = Column(Integer, default=1)
    parent_essay_id = Column(Integer, ForeignKey("essays.id"), nullable=True)
    is_latest = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="essays")
    # Self-referential relationship for versions
    versions = relationship("Essay", backref="parent", remote_side=[id])
EOF

# Update schemas.py - add auth and version schemas
cat > "backend/schemas.py" << 'EOF'
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# Essay schemas
class EssayCreate(BaseModel):
    school_name: str
    program_type: str
    essay_prompt: str
    essay_content: str
    parent_essay_id: Optional[int] = None  # For creating new version


class EssayResponse(BaseModel):
    id: int
    user_id: int
    school_name: str
    program_type: str
    essay_prompt: str
    essay_content: str
    ai_review: Optional[str]
    review_score: Optional[float]
    version: int
    parent_essay_id: Optional[int]
    is_latest: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class EssayReviewRequest(BaseModel):
    focus_areas: Optional[List[str]] = None


class ReviewResponse(BaseModel):
    essay_id: int
    review_content: str
    score: Optional[float]


class EssayVersionInfo(BaseModel):
    """Info about essay versions"""
    essay_id: int
    total_versions: int
    current_version: int
    versions: List[EssayResponse]
    
    class Config:
        from_attributes = True
EOF

# Update main.py - add authentication routes and protect endpoints
cat > "backend/main.py" << 'EOFMAIN'
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
import os
from anthropic import Anthropic
from datetime import timedelta

from database import get_db, engine, Base
from models import Essay, User
from schemas import (
    EssayCreate, EssayResponse, EssayReviewRequest, ReviewResponse,
    UserCreate, UserLogin, UserResponse, Token, EssayVersionInfo
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MBA/MS Application Platform")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock mode for free development
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"

# Initialize Anthropic client only if not in mock mode
anthropic_client = None
if not MOCK_MODE:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        anthropic_client = Anthropic(api_key=api_key)
    else:
        print("⚠️  No API key found. Running in MOCK_MODE.")


@app.get("/")
def read_root():
    return {"message": "MBA/MS Application Platform API", "status": "running"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "mock_mode": MOCK_MODE,
        "message": "Using mock AI reviews (free)" if MOCK_MODE else "Using real Claude API"
    }


# =============================================================================
# AUTHENTICATION ENDPOINTS
# =============================================================================

@app.post("/auth/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user account"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }


@app.post("/auth/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token"""
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user


# =============================================================================
# ESSAY ENDPOINTS (Now with authentication)
# =============================================================================

@app.post("/essays/", response_model=EssayResponse)
async def create_essay(
    essay: EssayCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new essay submission or version"""
    
    # If this is a new version of an existing essay
    if essay.parent_essay_id:
        parent = db.query(Essay).filter(
            and_(
                Essay.id == essay.parent_essay_id,
                Essay.user_id == current_user.id
            )
        ).first()
        
        if not parent:
            raise HTTPException(status_code=404, detail="Parent essay not found")
        
        # Mark all previous versions as not latest
        db.query(Essay).filter(
            Essay.parent_essay_id == essay.parent_essay_id
        ).update({"is_latest": False})
        
        db.query(Essay).filter(
            Essay.id == essay.parent_essay_id
        ).update({"is_latest": False})
        
        # Get the version number
        version_count = db.query(Essay).filter(
            Essay.parent_essay_id == essay.parent_essay_id
        ).count()
        
        new_version = version_count + 2  # +1 for parent, +1 for new version
        parent_id = essay.parent_essay_id
    else:
        new_version = 1
        parent_id = None
    
    db_essay = Essay(
        user_id=current_user.id,
        school_name=essay.school_name,
        program_type=essay.program_type,
        essay_prompt=essay.essay_prompt,
        essay_content=essay.essay_content,
        version=new_version,
        parent_essay_id=parent_id,
        is_latest=True
    )
    
    db.add(db_essay)
    db.commit()
    db.refresh(db_essay)
    return db_essay


@app.get("/essays/", response_model=List[EssayResponse])
async def get_essays(
    current_user: User = Depends(get_current_user),
    latest_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get user's essays (latest versions by default)"""
    query = db.query(Essay).filter(Essay.user_id == current_user.id)
    
    if latest_only:
        query = query.filter(Essay.is_latest == True)
    
    essays = query.offset(skip).limit(limit).all()
    return essays


@app.get("/essays/{essay_id}", response_model=EssayResponse)
async def get_essay(
    essay_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific essay"""
    essay = db.query(Essay).filter(
        and_(
            Essay.id == essay_id,
            Essay.user_id == current_user.id
        )
    ).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    return essay


@app.get("/essays/{essay_id}/versions", response_model=EssayVersionInfo)
async def get_essay_versions(
    essay_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all versions of an essay"""
    essay = db.query(Essay).filter(
        and_(
            Essay.id == essay_id,
            Essay.user_id == current_user.id
        )
    ).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    # Find the root essay (parent of all versions)
    root_id = essay.parent_essay_id if essay.parent_essay_id else essay.id
    
    # Get all versions
    versions = db.query(Essay).filter(
        and_(
            Essay.user_id == current_user.id,
            ((Essay.id == root_id) | (Essay.parent_essay_id == root_id))
        )
    ).order_by(Essay.version).all()
    
    return {
        "essay_id": essay_id,
        "total_versions": len(versions),
        "current_version": essay.version,
        "versions": versions
    }


@app.post("/essays/{essay_id}/review", response_model=ReviewResponse)
async def review_essay(
    essay_id: int,
    review_request: EssayReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI review for an essay"""
    essay = db.query(Essay).filter(
        and_(
            Essay.id == essay_id,
            Essay.user_id == current_user.id
        )
    ).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    try:
        if MOCK_MODE:
            review_content, score = generate_mock_review(essay)
        else:
            if not anthropic_client:
                raise HTTPException(
                    status_code=503,
                    detail="Claude API not configured. Set ANTHROPIC_API_KEY or enable MOCK_MODE."
                )
            
            prompt = f"""You are an expert admissions consultant reviewing MBA/MS application essays.

School: {essay.school_name}
Program Type: {essay.program_type}
Essay Prompt: {essay.essay_prompt}

Essay Content:
{essay.essay_content}

Please provide a comprehensive review with:
1. Overall Assessment (strengths and weaknesses)
2. Structure and Flow Analysis
3. Content Quality (storytelling, authenticity, impact)
4. Specific Suggestions for Improvement
5. Grammar and Style Review
6. Overall Score (1-10) and Competitiveness

Focus Areas: {', '.join(review_request.focus_areas) if review_request.focus_areas else 'All aspects'}
"""

            message = anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            review_content = message.content[0].text
            score = extract_score(review_content)
        
        essay.ai_review = review_content
        essay.review_score = score
        db.commit()
        
        return ReviewResponse(
            essay_id=essay_id,
            review_content=review_content,
            score=score
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Review failed: {str(e)}")


@app.delete("/essays/{essay_id}")
async def delete_essay(
    essay_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an essay"""
    essay = db.query(Essay).filter(
        and_(
            Essay.id == essay_id,
            Essay.user_id == current_user.id
        )
    ).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    db.delete(essay)
    db.commit()
    return {"message": "Essay deleted successfully"}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_mock_review(essay: Essay) -> tuple[str, float]:
    """Generate a realistic mock AI review for development/testing"""
    word_count = len(essay.essay_content.split())
    
    if word_count < 100:
        score = 4.5
        review = f"""**MOCK REVIEW MODE** (Free Development Version)

**Overall Assessment: Developing (4.5/10)**

Your essay for {essay.school_name}'s {essay.program_type} program shows promise but needs significant development.

**Strengths:**
- You've made a start on addressing the prompt
- Basic structure is present

**Areas for Improvement:**
1. **Length & Depth**: At {word_count} words, this essay is too brief. Most competitive essays are 500-650 words.
2. **Storytelling**: Add concrete anecdotes and experiences.
3. **Structure**: Consider reorganizing with a clear narrative arc.
4. **Specificity**: Replace general statements with specific details.

**Recommendations:**
- Expand to at least 500 words
- Add 2-3 specific examples from your experience
- Show, don't tell - use vivid descriptions

---
💡 *This is a simulated review. Enable Claude API for detailed, personalized feedback.*
"""
    elif word_count < 300:
        score = 6.5
        review = f"""**MOCK REVIEW MODE** (Free Development Version)

**Overall Assessment: Good Foundation (6.5/10)**

Your {essay.program_type} application essay for {essay.school_name} demonstrates good potential.

**Strengths:**
- Adequate length ({word_count} words)
- Clear attempt to address the prompt
- Some personal experiences included

**Areas for Improvement:**
1. **Opening Impact**: Your introduction needs a stronger hook.
2. **Depth of Reflection**: Dig deeper into the "why" and "so what".
3. **School-Specific Content**: Add more specific references to {essay.school_name}.
4. **Transitions**: Strengthen connections between sections.

**Score: 6.5/10** - Competitive foundation, needs refinement.

---
💡 *This is a simulated review. Enable Claude API for detailed, personalized feedback.*
"""
    else:
        score = 8.0
        review = f"""**MOCK REVIEW MODE** (Free Development Version)

**Overall Assessment: Strong & Competitive (8.0/10)**

Excellent work on your {essay.program_type} essay for {essay.school_name}!

**Major Strengths:**
- Compelling narrative with clear arc
- Strong opening that engages the reader
- Specific examples with concrete details
- Appropriate length: {word_count} words
- Authentic personal voice

**Minor Refinements:**
1. Consider expanding one key section by 50-75 words
2. Weave in one more {essay.school_name}-specific detail
3. Polish transitions between paragraphs

**Competitiveness: HIGH** - This would be competitive at top programs.

**Score: 8.0/10** - You're in great shape!

---
💡 *This is a simulated review. Enable Claude API for detailed, personalized feedback.*
"""
    
    return review, score


def extract_score(review_text: str) -> float:
    """Extract score from review text"""
    import re
    match = re.search(r'(\d+(?:\.\d+)?)\s*/\s*10', review_text)
    if match:
        return float(match.group(1))
    return 0.0
EOFMAIN

echo "✅ Backend updated"
echo ""
echo "📝 Updating frontend files..."

# =============================================================================
# FRONTEND UPDATES
# =============================================================================

# Update package.json to add React Router
cat > "frontend/package.json" << 'EOF'
{
  "name": "mba-platform-frontend",
  "version": "0.2.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.0",
    "react-router-dom": "^6.20.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF

# Create new frontend components
mkdir -p frontend/src/components
mkdir -p frontend/src/contexts

# Create AuthContext for managing authentication state
cat > "frontend/src/contexts/AuthContext.js" << 'EOF'
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Set axios default auth header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return userData;
  };

  const signup = async (email, name, password) => {
    const response = await axios.post(`${API_URL}/auth/signup`, {
      email,
      name,
      password
    });
    
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
EOF

# Create Login component
cat > "frontend/src/components/Login.js" << 'EOF'
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

function Login({ onSwitchToSignup }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Login to continue reviewing your essays</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button onClick={onSwitchToSignup} className="link-button">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
EOF

# Create Signup component
cat > "frontend/src/components/Signup.js" << 'EOF'
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

function Signup({ onSwitchToLogin }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(email, name, password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Start getting AI-powered essay reviews</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="link-button">
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;
EOF

# Create Auth.css for login/signup styling
cat > "frontend/src/components/Auth.css" << 'EOF'
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.auth-box {
  background: white;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 450px;
}

.auth-box h2 {
  margin-bottom: 0.5rem;
  color: #333;
  text-align: center;
}

.auth-subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.auth-button {
  width: 100%;
  padding: 0.875rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
  margin-top: 1rem;
}

.auth-button:hover:not(:disabled) {
  background: #5568d3;
}

.auth-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.auth-switch {
  text-align: center;
  margin-top: 1.5rem;
  color: #666;
}

.link-button {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
  padding: 0;
}

.link-button:hover {
  color: #5568d3;
}
EOF

echo "Creating updated App.js with all new features..."

# Update App.js with authentication, versioning, and side-by-side view
cat > "frontend/src/App.js" << 'EOFAPPNEW'
import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function AppContent() {
  const { user, logout, loading: authLoading } = useAuth();
  const [essays, setEssays] = useState([]);
  const [selectedEssay, setSelectedEssay] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAuth, setShowAuth] = useState('login'); // 'login' or 'signup'
  const [viewMode, setViewMode] = useState('normal'); // 'normal' or 'sidebyside'
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  
  const [formData, setFormData] = useState({
    school_name: '',
    program_type: 'MBA',
    essay_prompt: '',
    essay_content: '',
    parent_essay_id: null
  });

  useEffect(() => {
    if (user) {
      fetchEssays();
    }
  }, [user]);

  const fetchEssays = async () => {
    try {
      const response = await axios.get(`${API_URL}/essays/`);
      setEssays(response.data);
    } catch (error) {
      console.error('Error fetching essays:', error);
    }
  };

  const fetchVersions = async (essayId) => {
    try {
      const response = await axios.get(`${API_URL}/essays/${essayId}/versions`);
      setVersions(response.data.versions);
      setShowVersions(true);
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/essays/`, formData);
      setFormData({
        school_name: '',
        program_type: 'MBA',
        essay_prompt: '',
        essay_content: '',
        parent_essay_id: null
      });
      setShowForm(false);
      fetchEssays();
      alert('Essay submitted successfully!');
    } catch (error) {
      console.error('Error submitting essay:', error);
      alert('Error submitting essay');
    }
    setLoading(false);
  };

  const handleReview = async (essayId) => {
    setLoading(true);
    setReview(null);
    try {
      const response = await axios.post(`${API_URL}/essays/${essayId}/review`, {
        focus_areas: ['structure', 'content', 'grammar']
      });
      setReview(response.data);
    } catch (error) {
      console.error('Error getting review:', error);
      alert('Error getting AI review');
    }
    setLoading(false);
  };

  const handleDelete = async (essayId) => {
    if (window.confirm('Are you sure you want to delete this essay?')) {
      try {
        await axios.delete(`${API_URL}/essays/${essayId}`);
        fetchEssays();
        setSelectedEssay(null);
        setReview(null);
      } catch (error) {
        console.error('Error deleting essay:', error);
      }
    }
  };

  const handleCreateNewVersion = () => {
    if (!selectedEssay) return;
    
    setFormData({
      school_name: selectedEssay.school_name,
      program_type: selectedEssay.program_type,
      essay_prompt: selectedEssay.essay_prompt,
      essay_content: selectedEssay.essay_content,
      parent_essay_id: selectedEssay.parent_essay_id || selectedEssay.id
    });
    setShowForm(true);
  };

  if (authLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return showAuth === 'login' ? (
      <Login onSwitchToSignup={() => setShowAuth('signup')} />
    ) : (
      <Signup onSwitchToLogin={() => setShowAuth('login')} />
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div>
            <h1>📚 MBA/MS Application Platform</h1>
            <p>AI-Powered Essay Review & Feedback</p>
          </div>
          <div className="user-menu">
            <span className="user-name">👤 {user.name}</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="sidebar">
          <button 
            className="new-essay-btn"
            onClick={() => {
              setFormData({
                school_name: '',
                program_type: 'MBA',
                essay_prompt: '',
                essay_content: '',
                parent_essay_id: null
              });
              setShowForm(!showForm);
            }}
          >
            + New Essay
          </button>
          
          <div className="essay-list">
            <h3>Your Essays</h3>
            {essays.length === 0 ? (
              <p className="empty-state">No essays yet. Create your first one!</p>
            ) : (
              essays.map(essay => (
                <div 
                  key={essay.id}
                  className={`essay-item ${selectedEssay?.id === essay.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedEssay(essay);
                    setReview(null);
                    setShowVersions(false);
                  }}
                >
                  <strong>{essay.school_name}</strong>
                  <span className="program-type">{essay.program_type}</span>
                  <div className="essay-meta-small">
                    <small>v{essay.version}</small>
                    {essay.review_score && (
                      <small className="score-badge">{essay.review_score}/10</small>
                    )}
                  </div>
                  <small>{new Date(essay.created_at).toLocaleDateString()}</small>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`main-content ${viewMode === 'sidebyside' ? 'side-by-side-view' : ''}`}>
          {showForm ? (
            <div className="essay-form">
              <h2>{formData.parent_essay_id ? 'Create New Version' : 'Submit New Essay'}</h2>
              {formData.parent_essay_id && (
                <div className="version-notice">
                  Creating version {(versions.find(v => v.id === formData.parent_essay_id)?.version || 0) + 1}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>School Name *</label>
                  <input
                    type="text"
                    value={formData.school_name}
                    onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                    placeholder="e.g., Harvard Business School"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Program Type *</label>
                  <select
                    value={formData.program_type}
                    onChange={(e) => setFormData({...formData, program_type: e.target.value})}
                  >
                    <option value="MBA">MBA</option>
                    <option value="MS Computer Science">MS Computer Science</option>
                    <option value="MS Data Science">MS Data Science</option>
                    <option value="MS Business Analytics">MS Business Analytics</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Essay Prompt *</label>
                  <textarea
                    value={formData.essay_prompt}
                    onChange={(e) => setFormData({...formData, essay_prompt: e.target.value})}
                    placeholder="Paste the essay prompt here..."
                    rows="3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Your Essay *</label>
                  <textarea
                    value={formData.essay_content}
                    onChange={(e) => setFormData({...formData, essay_content: e.target.value})}
                    placeholder="Paste or write your essay here..."
                    rows="12"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={loading}>
                    {loading ? 'Submitting...' : (formData.parent_essay_id ? 'Create Version' : 'Submit Essay')}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : selectedEssay ? (
            viewMode === 'sidebyside' && (review || selectedEssay.ai_review) ? (
              <div className="side-by-side-container">
                <div className="essay-column">
                  <h3>Your Essay</h3>
                  <div className="essay-text">{selectedEssay.essay_content}</div>
                </div>
                <div className="review-column">
                  <h3>
                    AI Review 
                    {(review?.score || selectedEssay.review_score) && (
                      <span className="score">
                        Score: {review?.score || selectedEssay.review_score}/10
                      </span>
                    )}
                  </h3>
                  <div className="review-content">
                    {review?.review_content || selectedEssay.ai_review}
                  </div>
                </div>
              </div>
            ) : (
              <div className="essay-detail">
                <div className="essay-header">
                  <div>
                    <h2>{selectedEssay.school_name}</h2>
                    <span className="version-badge">Version {selectedEssay.version}</span>
                  </div>
                  <div className="essay-actions">
                    <button 
                      onClick={() => handleReview(selectedEssay.id)}
                      disabled={loading}
                      className="review-btn"
                    >
                      {loading ? 'Reviewing...' : '🤖 Get AI Review'}
                    </button>
                    {(review || selectedEssay.ai_review) && (
                      <button 
                        onClick={() => setViewMode(viewMode === 'normal' ? 'sidebyside' : 'normal')}
                        className="view-toggle-btn"
                      >
                        {viewMode === 'normal' ? '⇄ Side-by-Side' : '📄 Normal View'}
                      </button>
                    )}
                    <button 
                      onClick={handleCreateNewVersion}
                      className="version-btn"
                    >
                      📝 New Version
                    </button>
                    <button 
                      onClick={() => fetchVersions(selectedEssay.id)}
                      className="history-btn"
                    >
                      🕐 History
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedEssay.id)}
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {showVersions && versions.length > 0 && (
                  <div className="versions-panel">
                    <h3>Version History ({versions.length} versions)</h3>
                    <div className="versions-list">
                      {versions.map(v => (
                        <div 
                          key={v.id}
                          className={`version-item ${v.id === selectedEssay.id ? 'current' : ''}`}
                          onClick={() => {
                            setSelectedEssay(v);
                            setShowVersions(false);
                            setReview(null);
                          }}
                        >
                          <div className="version-header">
                            <strong>Version {v.version}</strong>
                            {v.is_latest && <span className="latest-badge">Latest</span>}
                          </div>
                          <div className="version-meta">
                            <small>{new Date(v.created_at).toLocaleString()}</small>
                            {v.review_score && (
                              <small className="version-score">{v.review_score}/10</small>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="essay-meta">
                  <span><strong>Program:</strong> {selectedEssay.program_type}</span>
                  <span><strong>Created:</strong> {new Date(selectedEssay.created_at).toLocaleString()}</span>
                  <span><strong>Words:</strong> {selectedEssay.essay_content.split(' ').length}</span>
                </div>

                <div className="essay-section">
                  <h3>Prompt</h3>
                  <p>{selectedEssay.essay_prompt}</p>
                </div>

                <div className="essay-section">
                  <h3>Your Essay</h3>
                  <p className="essay-text">{selectedEssay.essay_content}</p>
                </div>

                {review && (
                  <div className="review-section">
                    <h3>AI Review {review.score && <span className="score">Score: {review.score}/10</span>}</h3>
                    <div className="review-content">
                      {review.review_content}
                    </div>
                  </div>
                )}

                {selectedEssay.ai_review && !review && (
                  <div className="review-section">
                    <h3>Previous Review {selectedEssay.review_score && <span className="score">Score: {selectedEssay.review_score}/10</span>}</h3>
                    <div className="review-content">
                      {selectedEssay.ai_review}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="empty-state-main">
              <h2>Welcome back, {user.name}! 👋</h2>
              <p>Select an essay from the sidebar or create a new one to get started.</p>
              <p>Get AI-powered feedback on your application essays!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
EOFAPPNEW

echo "Updating App.css with new styles..."

# Update App.css with new styles for all features
cat > "frontend/src/App.css" << 'EOFCSS'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f5f5f5;
}

.App {
  min-height: 100vh;
}

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 1.5rem;
  color: #667eea;
}

.App-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 2rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.App-header h1 {
  margin-bottom: 0.25rem;
  font-size: 1.75rem;
}

.App-header p {
  opacity: 0.9;
  font-size: 1rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-size: 0.95rem;
  opacity: 0.95;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9rem;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.container {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 100px);
}

.sidebar {
  width: 300px;
  background: white;
  padding: 1.5rem;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  max-height: calc(100vh - 100px);
}

.new-essay-btn {
  width: 100%;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: background 0.3s;
  font-weight: 500;
}

.new-essay-btn:hover {
  background: #5568d3;
}

.essay-list h3 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.1rem;
}

.essay-item {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.essay-item:hover {
  background: #f0f0f0;
  transform: translateX(4px);
}

.essay-item.selected {
  background: #e8eaf6;
  border-color: #667eea;
}

.essay-item strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #333;
  font-size: 0.95rem;
}

.essay-item .program-type {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #667eea;
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}

.essay-meta-small {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.score-badge {
  background: #4caf50;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
}

.essay-item small {
  display: block;
  color: #666;
  font-size: 0.85rem;
}

.main-content {
  flex: 1;
  padding: 2rem;
  background: white;
  overflow-y: auto;
  max-height: calc(100vh - 100px);
}

.main-content.side-by-side-view {
  padding: 0;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 2rem 0;
  font-size: 0.9rem;
}

.empty-state-main {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.empty-state-main h2 {
  margin-bottom: 1rem;
  color: #333;
}

.essay-form h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.version-notice {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.form-actions button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.form-actions button[type="submit"] {
  background: #667eea;
  color: white;
}

.form-actions button[type="submit"]:hover:not(:disabled) {
  background: #5568d3;
}

.form-actions button[type="submit"]:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.form-actions button[type="button"] {
  background: #e0e0e0;
  color: #333;
}

.essay-detail {
  max-width: 900px;
}

.essay-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f0f0f0;
  gap: 1rem;
}

.essay-header > div:first-child {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.essay-header h2 {
  color: #333;
  margin: 0;
}

.version-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.essay-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.review-btn,
.delete-btn,
.version-btn,
.history-btn,
.view-toggle-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
  white-space: nowrap;
}

.review-btn {
  background: #667eea;
  color: white;
}

.review-btn:hover:not(:disabled) {
  background: #5568d3;
}

.review-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.view-toggle-btn {
  background: #2196f3;
  color: white;
}

.view-toggle-btn:hover {
  background: #1976d2;
}

.version-btn {
  background: #ff9800;
  color: white;
}

.version-btn:hover {
  background: #f57c00;
}

.history-btn {
  background: #9c27b0;
  color: white;
}

.history-btn:hover {
  background: #7b1fa2;
}

.delete-btn {
  background: #ff5252;
  color: white;
}

.delete-btn:hover {
  background: #e04848;
}

.versions-panel {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.versions-panel h3 {
  margin-bottom: 1rem;
  color: #333;
}

.versions-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.version-item {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 2px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.3s;
}

.version-item:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.version-item.current {
  border-color: #667eea;
  background: #e8eaf6;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.latest-badge {
  background: #4caf50;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
}

.version-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-score {
  background: #4caf50;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-weight: 500;
}

.essay-meta {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  color: #666;
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.essay-section {
  margin-bottom: 2rem;
}

.essay-section h3 {
  margin-bottom: 1rem;
  color: #333;
}

.essay-section p {
  line-height: 1.8;
  color: #444;
}

.essay-text {
  white-space: pre-wrap;
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.review-section {
  background: #f0f8ff;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
  margin-top: 2rem;
}

.review-section h3 {
  color: #1976d2;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.score {
  background: #4caf50;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: normal;
}

.review-content {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #333;
}

/* Side-by-Side View */
.side-by-side-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: calc(100vh - 100px);
  gap: 0;
}

.essay-column,
.review-column {
  padding: 2rem;
  overflow-y: auto;
}

.essay-column {
  border-right: 2px solid #e0e0e0;
  background: #fafafa;
}

.review-column {
  background: #f0f8ff;
}

.essay-column h3,
.review-column h3 {
  position: sticky;
  top: 0;
  background: inherit;
  padding: 1rem 0;
  margin: -1rem 0 1rem 0;
  z-index: 10;
  border-bottom: 2px solid #e0e0e0;
}

.review-column h3 {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #1976d2;
}

/* Responsive */
@media (max-width: 1024px) {
  .side-by-side-container {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .essay-column {
    border-right: none;
    border-bottom: 2px solid #e0e0e0;
  }
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    max-height: none;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .essay-actions {
    flex-direction: column;
  }
  
  .essay-actions button {
    width: 100%;
  }
}
EOFCSS

echo "✅ Frontend updated"
echo ""
echo "================================================"
echo "✅ Update Complete!"
echo "================================================"
echo ""
echo "New Features Added:"
echo "  ✅ User Authentication (Login/Signup)"
echo "  ✅ Essay Version History & Tracking"
echo "  ✅ Side-by-Side Review View"
echo ""
echo "Next Steps:"
echo "  1. Stop your current containers: docker-compose down"
echo "  2. Rebuild and start: docker-compose up --build"
echo "  3. Open http://localhost:3000"
echo "  4. Create an account and start using the new features!"
echo ""
echo "New Features Guide:"
echo "  • Sign up with email/password"
echo "  • Create essays (now private to your account)"
echo "  • Click 'New Version' to iterate on essays"
echo "  • Click 'History' to see all versions"
echo "  • Click 'Side-by-Side' to view essay + review together"
echo ""
echo "Your backup is saved in: $BACKUP_DIR/"
echo ""
