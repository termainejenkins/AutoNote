from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
from prometheus_client import Counter, Histogram
import time
import httpx
from datetime import datetime
import openai
from transformers import pipeline
import torch
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from nltk.tokenize import sent_tokenize
import nltk

# Download required NLTK data
nltk.download('punkt')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
AI_OPERATIONS = Counter('ai_operations_total', 'Total AI operations', ['operation'])
AI_LATENCY = Histogram('ai_operation_duration_seconds', 'AI operation latency', ['operation'])

app = FastAPI(
    title="AutoNote AI Service",
    description="AI Processing Service for AutoNote",
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
class AIRequest(BaseModel):
    content: str
    operation: str  # summarize, extract_key_points, generate_questions
    user_id: str
    metadata: Optional[Dict[str, Any]] = None

class AIResponse(BaseModel):
    id: str
    operation: str
    result: Dict[str, Any]
    processed_at: datetime
    status: str

# In-memory storage for processed content
ai_results_store = {}

# Initialize AI models
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
question_generator = pipeline("text2text-generation", model="t5-base")

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

def extract_key_points(text: str, num_points: int = 5) -> List[str]:
    """Extract key points from text using TF-IDF and sentence importance"""
    # Split text into sentences
    sentences = sent_tokenize(text)
    
    # Calculate TF-IDF scores
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(sentences)
    
    # Calculate sentence scores
    sentence_scores = np.array(tfidf_matrix.sum(axis=1)).flatten()
    
    # Get top sentences
    top_indices = sentence_scores.argsort()[-num_points:][::-1]
    key_points = [sentences[i] for i in sorted(top_indices)]
    
    return key_points

def generate_questions(text: str, num_questions: int = 3) -> List[str]:
    """Generate questions from text using T5 model"""
    # Split text into chunks if too long
    max_chunk_length = 512
    chunks = [text[i:i + max_chunk_length] for i in range(0, len(text), max_chunk_length)]
    
    questions = []
    for chunk in chunks:
        # Generate questions for each chunk
        inputs = f"generate questions: {chunk}"
        outputs = question_generator(inputs, max_length=100, num_return_sequences=num_questions)
        chunk_questions = [output['generated_text'] for output in outputs]
        questions.extend(chunk_questions)
    
    return questions[:num_questions]

# Endpoints
@app.post("/process", response_model=AIResponse)
async def process_content(
    request: AIRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user)
):
    start_time = time.time()
    
    if request.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to process content for this user")
    
    result_id = f"{request.operation}_{int(time.time())}"
    
    try:
        result = {}
        if request.operation == "summarize":
            # Generate summary using BART
            summary = summarizer(request.content, max_length=130, min_length=30, do_sample=False)
            result["summary"] = summary[0]["summary_text"]
            
        elif request.operation == "extract_key_points":
            # Extract key points
            key_points = extract_key_points(request.content)
            result["key_points"] = key_points
            
        elif request.operation == "generate_questions":
            # Generate questions
            questions = generate_questions(request.content)
            result["questions"] = questions
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported operation: {request.operation}")
        
        ai_response = AIResponse(
            id=result_id,
            operation=request.operation,
            result=result,
            processed_at=datetime.utcnow(),
            status="completed"
        )
        
        ai_results_store[result_id] = ai_response
        
        AI_OPERATIONS.labels(operation=request.operation).inc()
        AI_LATENCY.labels(operation=request.operation).observe(time.time() - start_time)
        
        return ai_response
        
    except Exception as e:
        logger.error(f"Error processing content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing content: {str(e)}")

@app.get("/results/{result_id}", response_model=AIResponse)
async def get_result(result_id: str, current_user: str = Depends(get_current_user)):
    start_time = time.time()
    
    if result_id not in ai_results_store:
        raise HTTPException(status_code=404, detail="Result not found")
    
    result = ai_results_store[result_id]
    
    AI_OPERATIONS.labels(operation="get").inc()
    AI_LATENCY.labels(operation="get").observe(time.time() - start_time)
    
    return result

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 