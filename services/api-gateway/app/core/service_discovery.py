from typing import Dict, Any
import httpx
import asyncio
from .config import settings
import logging

logger = logging.getLogger(__name__)

class ServiceDiscovery:
    def __init__(self):
        self.services = {
            "auth": settings.AUTH_SERVICE_URL,
            "notes": settings.NOTE_SERVICE_URL,
            "content": settings.CONTENT_SERVICE_URL,
            "ai": settings.AI_SERVICE_URL
        }
        self.health_status = {service: False for service in self.services}
        self._start_health_check()
    
    def _start_health_check(self):
        """Start periodic health checks for all services"""
        asyncio.create_task(self._periodic_health_check())
    
    async def _periodic_health_check(self):
        """Periodically check health of all services"""
        while True:
            await self.check_all_services()
            await asyncio.sleep(30)  # Check every 30 seconds
    
    async def check_all_services(self) -> Dict[str, bool]:
        """Check health of all services"""
        async with httpx.AsyncClient() as client:
            tasks = []
            for service, url in self.services.items():
                tasks.append(self._check_service_health(client, service, url))
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for service, result in zip(self.services.keys(), results):
                if isinstance(result, Exception):
                    logger.error(f"Health check failed for {service}: {str(result)}")
                    self.health_status[service] = False
                else:
                    self.health_status[service] = result
            
            return self.health_status
    
    async def _check_service_health(self, client: httpx.AsyncClient, service: str, url: str) -> bool:
        """Check health of a single service"""
        try:
            response = await client.get(f"{url}/health", timeout=5.0)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Error checking health for {service}: {str(e)}")
            return False
    
    def get_service_url(self, service: str) -> str:
        """Get URL for a specific service"""
        if service not in self.services:
            raise ValueError(f"Unknown service: {service}")
        return self.services[service]
    
    def is_service_healthy(self, service: str) -> bool:
        """Check if a specific service is healthy"""
        return self.health_status.get(service, False)
    
    def get_all_health_status(self) -> Dict[str, bool]:
        """Get health status of all services"""
        return self.health_status.copy()

service_discovery = ServiceDiscovery() 