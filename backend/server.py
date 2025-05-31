from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
import os
from datetime import datetime, timedelta
import jwt
import bcrypt
from typing import List, Optional
import uuid

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'blog_database')
client = MongoClient(mongo_url)
db = client[db_name]

# Collections
posts_collection = db.posts
categories_collection = db.categories
users_collection = db.users

# JWT settings
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer()

# Models
class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    excerpt: str = ""
    category: str
    image_url: str = ""
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    published: bool = True

class PostCreate(BaseModel):
    title: str
    content: str
    excerpt: str = ""
    category: str
    image_url: str = ""
    published: bool = True

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    published: Optional[bool] = None

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=datetime.now)

class CategoryCreate(BaseModel):
    name: str
    description: str = ""

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Initialize admin user
def init_admin_user():
    admin_exists = users_collection.find_one({"username": "admin"})
    if not admin_exists:
        hashed_password = bcrypt.hashpw("Adoegyzseni".encode('utf-8'), bcrypt.gensalt())
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password": hashed_password,
            "created_at": datetime.now()
        }
        users_collection.insert_one(admin_user)
        print("Admin user created with username: admin, password: Adoegyzseni")

# Initialize default categories
def init_default_categories():
    default_categories = [
        {"name": "Technológia", "description": "Technológiai témájú bejegyzések"},
        {"name": "Életmód", "description": "Életmód és személyes bejegyzések"},
        {"name": "Utazás", "description": "Utazási élmények és tippek"},
        {"name": "Gasztronómia", "description": "Receptek és kulináris élmények"},
        {"name": "Kultúra", "description": "Művészet, zene, irodalom"}
    ]
    
    for cat_data in default_categories:
        existing = categories_collection.find_one({"name": cat_data["name"]})
        if not existing:
            category = Category(name=cat_data["name"], description=cat_data["description"])
            categories_collection.insert_one(category.dict())

# JWT functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth endpoints
@app.post("/api/auth/login", response_model=Token)
async def login(login_request: LoginRequest):
    user = users_collection.find_one({"username": login_request.username})
    if not user or not bcrypt.checkpw(login_request.password.encode('utf-8'), user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/verify")
async def verify_auth(current_user: str = Depends(verify_token)):
    return {"username": current_user, "authenticated": True}

# Category endpoints
@app.get("/api/categories", response_model=List[Category])
async def get_categories():
    categories = list(categories_collection.find())
    for cat in categories:
        cat.pop('_id', None)
    return categories

@app.post("/api/categories", response_model=Category)
async def create_category(category: CategoryCreate, current_user: str = Depends(verify_token)):
    new_category = Category(**category.dict())
    categories_collection.insert_one(new_category.dict())
    return new_category

# Post endpoints
@app.get("/api/posts", response_model=List[Post])
async def get_posts(published_only: bool = True):
    query = {"published": True} if published_only else {}
    posts = list(posts_collection.find(query).sort("created_at", -1))
    for post in posts:
        post.pop('_id', None)
    return posts

@app.get("/api/posts/{post_id}", response_model=Post)
async def get_post(post_id: str):
    post = posts_collection.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.pop('_id', None)
    return post

@app.post("/api/posts", response_model=Post)
async def create_post(post: PostCreate, current_user: str = Depends(verify_token)):
    # Generate excerpt from content if not provided
    if not post.excerpt and post.content:
        # Strip HTML tags and take first 150 characters
        import re
        clean_text = re.sub('<[^<]+?>', '', post.content)
        post.excerpt = clean_text[:150] + "..." if len(clean_text) > 150 else clean_text
    
    new_post = Post(**post.dict())
    posts_collection.insert_one(new_post.dict())
    return new_post

@app.put("/api/posts/{post_id}", response_model=Post)
async def update_post(post_id: str, post_update: PostUpdate, current_user: str = Depends(verify_token)):
    existing_post = posts_collection.find_one({"id": post_id})
    if not existing_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = {k: v for k, v in post_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now()
    
    # Update excerpt if content is updated
    if "content" in update_data and update_data["content"]:
        import re
        clean_text = re.sub('<[^<]+?>', '', update_data["content"])
        update_data["excerpt"] = clean_text[:150] + "..." if len(clean_text) > 150 else clean_text
    
    posts_collection.update_one({"id": post_id}, {"$set": update_data})
    
    updated_post = posts_collection.find_one({"id": post_id})
    updated_post.pop('_id', None)
    return updated_post

@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str, current_user: str = Depends(verify_token)):
    result = posts_collection.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted successfully"}

# Initialize data on startup
@app.on_event("startup")
async def startup_event():
    init_admin_user()
    init_default_categories()
    print("Blog application started successfully!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)