from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware to handle errors and add CORS headers to error responses"""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            # Ensure CORS headers are added to all responses
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
            return response
        except Exception as e:
            logger.error(f"Unhandled error: {e}", exc_info=True)
            # Return error response with CORS headers
            from fastapi.responses import JSONResponse
            error_response = JSONResponse(
                status_code=500,
                content={"detail": str(e)}
            )
            error_response.headers["Access-Control-Allow-Origin"] = "*"
            error_response.headers["Access-Control-Allow-Methods"] = "*"
            error_response.headers["Access-Control-Allow-Headers"] = "*"
            return error_response

