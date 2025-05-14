from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import time
from collections import defaultdict
import asyncio
from .config import settings

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = asyncio.Lock()
    
    async def is_rate_limited(self, client_id: str) -> bool:
        async with self.lock:
            now = time.time()
            # Remove requests older than 1 minute
            self.requests[client_id] = [
                req_time for req_time in self.requests[client_id]
                if now - req_time < 60
            ]
            
            if len(self.requests[client_id]) >= settings.RATE_LIMIT_PER_MINUTE:
                return True
            
            self.requests[client_id].append(now)
            return False

rate_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    # Get client identifier (IP address or API key)
    client_id = request.headers.get(settings.API_KEY_HEADER, request.client.host)
    
    if await rate_limiter.is_rate_limited(client_id):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests"}
        )
    
    return await call_next(request) 