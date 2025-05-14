from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, HttpUrl
import logging
from prometheus_client import Counter, Histogram
import time
import httpx
from datetime import datetime
import asyncio
from playwright.async_api import async_playwright
import PyPDF2
import io
import aiohttp
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
CONTENT_OPERATIONS = Counter('content_operations_total', 'Total content operations', ['operation', 'source_type'])
CONTENT_LATENCY = Histogram('content_operation_duration_seconds', 'Content operation latency', ['operation', 'source_type'])

app = FastAPI(
    title="AutoNote Content Service",
    description="Content Processing Service for AutoNote",
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
class ContentRequest(BaseModel):
    url: HttpUrl
    source_type: str  # web, pdf, video, coursera
    user_id: str

class ContentResponse(BaseModel):
    id: str
    title: str
    content: str
    source_type: str
    source_url: str
    metadata: Dict[str, Any]
    processed_at: datetime
    status: str

# In-memory storage for processed content
content_store = {}

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

async def process_web_content(url: str) -> Dict[str, Any]:
    """Process web content using Playwright"""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(url)
        
        # Wait for content to load
        await page.wait_for_load_state("networkidle")
        
        # Extract content
        title = await page.title()
        content = await page.content()
        
        # Clean content using BeautifulSoup
        soup = BeautifulSoup(content, 'html.parser')
        
        # Remove unwanted elements
        for element in soup.find_all(['script', 'style', 'nav', 'footer']):
            element.decompose()
        
        # Extract main content
        main_content = soup.find('main') or soup.find('article') or soup.find('body')
        text_content = main_content.get_text(separator='\n', strip=True)
        
        # Extract metadata
        metadata = {
            'title': title,
            'description': soup.find('meta', {'name': 'description'}).get('content', '') if soup.find('meta', {'name': 'description'}) else '',
            'keywords': soup.find('meta', {'name': 'keywords'}).get('content', '') if soup.find('meta', {'name': 'keywords'}) else '',
        }
        
        await browser.close()
        
        return {
            'title': title,
            'content': text_content,
            'metadata': metadata
        }

async def process_pdf_content(url: str) -> Dict[str, Any]:
    """Process PDF content"""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch PDF")
            
            pdf_content = await response.read()
            pdf_file = io.BytesIO(pdf_content)
            
            # Read PDF
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            # Extract text from all pages
            text_content = ""
            for page in pdf_reader.pages:
                text_content += page.extract_text() + "\n"
            
            # Extract metadata
            metadata = {
                'title': pdf_reader.metadata.get('/Title', ''),
                'author': pdf_reader.metadata.get('/Author', ''),
                'pages': len(pdf_reader.pages)
            }
            
            return {
                'title': metadata['title'] or 'Untitled PDF',
                'content': text_content,
                'metadata': metadata
            }

# Endpoints
@app.post("/process", response_model=ContentResponse)
async def process_content(
    request: ContentRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user)
):
    start_time = time.time()
    
    if request.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to process content for this user")
    
    content_id = f"{request.source_type}_{int(time.time())}"
    
    try:
        if request.source_type == "web":
            result = await process_web_content(str(request.url))
        elif request.source_type == "pdf":
            result = await process_pdf_content(str(request.url))
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported source type: {request.source_type}")
        
        content = ContentResponse(
            id=content_id,
            title=result['title'],
            content=result['content'],
            source_type=request.source_type,
            source_url=str(request.url),
            metadata=result['metadata'],
            processed_at=datetime.utcnow(),
            status="completed"
        )
        
        content_store[content_id] = content
        
        CONTENT_OPERATIONS.labels(operation="process", source_type=request.source_type).inc()
        CONTENT_LATENCY.labels(operation="process", source_type=request.source_type).observe(time.time() - start_time)
        
        return content
        
    except Exception as e:
        logger.error(f"Error processing content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing content: {str(e)}")

@app.get("/content/{content_id}", response_model=ContentResponse)
async def get_content(content_id: str, current_user: str = Depends(get_current_user)):
    start_time = time.time()
    
    if content_id not in content_store:
        raise HTTPException(status_code=404, detail="Content not found")
    
    content = content_store[content_id]
    
    CONTENT_OPERATIONS.labels(operation="get", source_type=content.source_type).inc()
    CONTENT_LATENCY.labels(operation="get", source_type=content.source_type).observe(time.time() - start_time)
    
    return content

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 