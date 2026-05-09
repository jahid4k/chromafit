from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from services import palette_service
from services.vision_service import VisionServiceError
from config import settings
from db.mongo import connect_db, _ensure_indexes, disconnect_db
from routers import analysis, sessions

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("app_starting", env=settings.app_env)
    await connect_db()
    palette_service.load_palettes()
    await _ensure_indexes()
    logger.info("app_ready", app_name=settings.app_name)

    yield

    await disconnect_db()
    logger.info("app_stopped")


app = FastAPI(
    title=settings.app_name,
    description="Outfit recommendation powered by Qwen2.5-VL on AMD MI300X",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Must be added BEFORE exception handlers and routers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handlers ─────────────────────────────────────────────────
# These ensure FastAPI (not Railway edge) always owns the response,
# which means CORS headers are always present.

@app.exception_handler(VisionServiceError)
async def vision_service_error_handler(request: Request, exc: VisionServiceError):
    logger.error("vision_service_error", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=503,
        content={
            "error": "vision_service_unavailable",
            "detail": str(exc),
            "hint": "The vLLM inference server is unreachable or timed out. Check VLLM_HOST and VLLM_PORT.",
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "unhandled_exception",
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "detail": "An unexpected error occurred.",
            "error_type": type(exc).__name__,
        },
    )


# ── Health checks ─────────────────────────────────────────────────────────────

@app.get("/")
async def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.app_env,
        "model": settings.vllm_model,
    }


@app.get("/health/vllm")
async def check_vllm():
    import httpx
    url = f"http://{settings.vllm_host}:{settings.vllm_port}/v1/models"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            return {
                "vllm_reachable": True,
                "status_code": r.status_code,
                "url_tried": url,
                "response": r.text[:500],
            }
    except httpx.ConnectError as e:
        return {"vllm_reachable": False, "error_type": "ConnectError", "error": str(e), "url_tried": url}
    except httpx.TimeoutException as e:
        return {"vllm_reachable": False, "error_type": "Timeout", "error": str(e), "url_tried": url}
    except Exception as e:
        return {"vllm_reachable": False, "error_type": type(e).__name__, "error": str(e), "url_tried": url}

@app.get("/health/config")
async def check_config():
    return {
        "vllm_host": settings.vllm_host,
        "vllm_port": settings.vllm_port,
        "vllm_model": settings.vllm_model,
    }

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(analysis.router)
app.include_router(sessions.router)