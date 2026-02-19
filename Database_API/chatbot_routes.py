"""
EtherVox AI Chatbot API Routes
FastAPI router for chatbot endpoint.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from chatbot_engine import get_chatbot_response

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str
    confidence: float
    matched_topic: str
    is_blocked: bool


@router.post("/ask", response_model=ChatResponse)
async def chatbot_ask(request: ChatRequest):
    """Process a chatbot message and return an AI-generated response."""
    result = get_chatbot_response(request.message)
    return ChatResponse(**result)
