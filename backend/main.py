from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.training import router as training_router
from backend.routes.clients import router as clients_router
from backend.routes.unlearning import router as unlearning_router

app = FastAPI(title="QuickDrop API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(training_router)
app.include_router(clients_router)
app.include_router(unlearning_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
