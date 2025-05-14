from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import logging
from prometheus_client import Counter, Histogram
import time
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
NOTE_OPERATIONS = Counter('note_operations_total', 'Total note operations', ['operation'])
NOTE_LATENCY = Histogram('note_operation_duration_seconds', 'Note operation latency', ['operation'])

app = FastAPI(
    title="AutoNote Note Service",
    description="Note Management Service for AutoNote",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class NoteBase(BaseModel):
    title: str
    content: str
    source_type: str  # web, video, coursera, manual
    source_url: Optional[str] = None
    tags: List[str] = []

class NoteCreate(NoteBase):
    pass

class Note(NoteBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    summary: Optional[str] = None
    key_points: List[str] = []

    class Config:
        orm_mode = True

# Mock database - Replace with actual database in production
notes_db = {}

# Helper functions
async def verify_token(token: str) -> str:
    """Verify JWT token with Auth Service"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "http://auth-service:8001/users/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return response.json()["username"]
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error verifying authentication"
            )

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from token"""
    return await verify_token(token)

# Endpoints
@app.post("/notes", response_model=Note)
async def create_note(note: NoteCreate, current_user: str = Depends(get_current_user)):
    start_time = time.time()
    note_id = str(len(notes_db) + 1)
    now = datetime.utcnow()
    
    new_note = Note(
        id=note_id,
        user_id=current_user,
        created_at=now,
        updated_at=now,
        **note.dict()
    )
    
    notes_db[note_id] = new_note
    NOTE_OPERATIONS.labels(operation="create").inc()
    NOTE_LATENCY.labels(operation="create").observe(time.time() - start_time)
    
    return new_note

@app.get("/notes", response_model=List[Note])
async def list_notes(
    current_user: str = Depends(get_current_user),
    skip: int = 0,
    limit: int = 10,
    source_type: Optional[str] = None,
    tag: Optional[str] = None
):
    start_time = time.time()
    user_notes = [
        note for note in notes_db.values()
        if note.user_id == current_user
    ]
    
    # Apply filters
    if source_type:
        user_notes = [note for note in user_notes if note.source_type == source_type]
    if tag:
        user_notes = [note for note in user_notes if tag in note.tags]
    
    # Apply pagination
    paginated_notes = user_notes[skip:skip + limit]
    
    NOTE_OPERATIONS.labels(operation="list").inc()
    NOTE_LATENCY.labels(operation="list").observe(time.time() - start_time)
    
    return paginated_notes

@app.get("/notes/{note_id}", response_model=Note)
async def get_note(note_id: str, current_user: str = Depends(get_current_user)):
    start_time = time.time()
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = notes_db[note_id]
    if note.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to access this note")
    
    NOTE_OPERATIONS.labels(operation="get").inc()
    NOTE_LATENCY.labels(operation="get").observe(time.time() - start_time)
    
    return note

@app.put("/notes/{note_id}", response_model=Note)
async def update_note(
    note_id: str,
    note_update: NoteCreate,
    current_user: str = Depends(get_current_user)
):
    start_time = time.time()
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = notes_db[note_id]
    if note.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to update this note")
    
    updated_note = Note(
        id=note_id,
        user_id=current_user,
        created_at=note.created_at,
        updated_at=datetime.utcnow(),
        **note_update.dict()
    )
    
    notes_db[note_id] = updated_note
    NOTE_OPERATIONS.labels(operation="update").inc()
    NOTE_LATENCY.labels(operation="update").observe(time.time() - start_time)
    
    return updated_note

@app.delete("/notes/{note_id}")
async def delete_note(note_id: str, current_user: str = Depends(get_current_user)):
    start_time = time.time()
    if note_id not in notes_db:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note = notes_db[note_id]
    if note.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to delete this note")
    
    del notes_db[note_id]
    NOTE_OPERATIONS.labels(operation="delete").inc()
    NOTE_LATENCY.labels(operation="delete").observe(time.time() - start_time)
    
    return {"status": "success"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 