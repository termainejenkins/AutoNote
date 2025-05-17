from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import logging
from typing import Dict, Any
import os
from prometheus_client import Counter, Histogram
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['method', 'endpoint'])

app = FastAPI(
    title="AutoNote API Gateway",
    description="API Gateway for AutoNote microservices",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Only allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
SERVICE_URLS = {
    "auth": os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001"),
    "notes": os.getenv("NOTE_SERVICE_URL", "http://note-service:8002"),
    "content": os.getenv("CONTENT_SERVICE_URL", "http://content-service:8003"),
    "ai": os.getenv("AI_SERVICE_URL", "http://ai-service:8004"),
}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Service health check
@app.get("/health/services")
async def service_health():
    health_status = {}
    async with httpx.AsyncClient() as client:
        for service, url in SERVICE_URLS.items():
            try:
                response = await client.get(f"{url}/health")
                health_status[service] = "healthy" if response.status_code == 200 else "unhealthy"
            except Exception as e:
                logger.error(f"Error checking {service} health: {str(e)}")
                health_status[service] = "unhealthy"
    return health_status

# Request forwarding middleware
@app.middleware("http")
async def forward_request(request, call_next):
    start_time = time.time()
    
    # Get the target service from the path
    path = request.url.path
    service = path.split("/")[1] if len(path.split("/")) > 1 else None

    # Handle CORS preflight (OPTIONS) requests
    if request.method == "OPTIONS":
        response = JSONResponse(content={"detail": "CORS preflight"}, status_code=200)
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    if service in SERVICE_URLS:
        try:
            # Forward the request to the appropriate service
            async with httpx.AsyncClient() as client:
                target_url = f"{SERVICE_URLS[service]}{path}"
                # Forward all headers, including Authorization
                headers = dict(request.headers)
                response = await client.request(
                    method=request.method,
                    url=target_url,
                    headers=headers,
                    params=dict(request.query_params),
                    content=await request.body()
                )
                # Record metrics
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=path,
                    status=response.status_code
                ).inc()
                REQUEST_LATENCY.labels(
                    method=request.method,
                    endpoint=path
                ).observe(time.time() - start_time)
                # Prepare response
                content_type = response.headers.get("content-type", "application/json")
                gateway_response = JSONResponse(
                    content=response.json() if "application/json" in content_type else response.text,
                    status_code=response.status_code,
                )
                # Set CORS headers
                gateway_response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
                gateway_response.headers["Access-Control-Allow-Credentials"] = "true"
                gateway_response.headers["Access-Control-Allow-Methods"] = "*"
                gateway_response.headers["Access-Control-Allow-Headers"] = "*"
                return gateway_response
        except Exception as e:
            logger.error(f"Error forwarding request to {service}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error forwarding request to {service}")

    # If no service is specified, proceed with normal request handling
    response = await call_next(request)
    # Set CORS headers for non-forwarded requests
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    # Record metrics for non-forwarded requests
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=path,
        status=response.status_code
    ).inc()
    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=path
    ).observe(time.time() - start_time)
    return response

# Error handling
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    ) 