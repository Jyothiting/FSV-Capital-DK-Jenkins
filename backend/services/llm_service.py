"""
LLM abstraction: OpenAI (LangChain) when configured, deterministic mock/heuristic otherwise.
"""
from __future__ import annotations

import json
import os
import re
from abc import ABC, abstractmethod
from typing import Any, Optional, Type, TypeVar

from pydantic import BaseModel

from config import settings

T = TypeVar("T", bound=BaseModel)


class BaseLLMProvider(ABC):
    name: str = "base"

    @abstractmethod
    def invoke(self, system: str, user: str) -> str:
        ...

    def invoke_json(self, system: str, user: str, model: Type[T]) -> T:
        raw = self.invoke(system, user)
        return _parse_json_model(raw, model)


class MockLLMProvider(BaseLLMProvider):
    """Deterministic responses for tests and offline demos."""

    name = "mock"

    def invoke(self, system: str, user: str) -> str:
        blob = (system + user).lower()
        if "executive" in blob or "diligence" in blob or "investment analyst" in blob:
            return json.dumps(
                {
                    "executive_summary": (
                        "Promising early-stage opportunity with clear problem-solution fit. "
                        "Validate traction claims and capital efficiency before IC."
                    ),
                    "strengths": [
                        "Aligned with FSV sector focus",
                        "Defined funding ask and use of funds",
                        "Experienced founding team indicated",
                    ],
                    "risks": [
                        "Execution risk at current stage",
                        "Competitive market — differentiation needs proof",
                        "Runway sensitive to burn assumptions",
                    ],
                    "diligence_questions": [
                        "What is current MRR and net revenue retention?",
                        "What milestones does this round unlock in 18 months?",
                        "Who are lead investors or angels already committed?",
                    ],
                    "recommendation": "Hold",
                }
            )
        if "coach" in blob or "improve" in blob:
            return json.dumps(
                {
                    "suggestions": [
                        "Lead with a quantified customer pain point.",
                        "Name one metric that proves early traction.",
                        "Tie the ask to 2–3 concrete milestones.",
                    ],
                    "improved_draft": user[-500:] if len(user) > 500 else user,
                }
            )
        if "knowledge base" in blob or "context" in blob:
            return (
                "Based on the retrieved FSV Capital policy documents, "
                "priority sectors include Fintech, AI, Blockchain, and DeepTech. "
                "Pre-seed and seed checks typically range from USD 250,000 to USD 2,000,000. "
                "(Mock LLM — set OPENAI_API_KEY for live synthesis.)"
            )
        return "AI response generated in mock mode. Configure OPENAI_API_KEY for live LLM output."


class OpenAILLMProvider(BaseLLMProvider):
    """OpenAI chat completions via LangChain."""

    name = "openai"

    def __init__(self) -> None:
        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_openai import ChatOpenAI

        self._SystemMessage = SystemMessage
        self._HumanMessage = HumanMessage
        self._chat = ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=settings.LLM_TEMPERATURE,
            api_key=settings.OPENAI_API_KEY,
        )

    def invoke(self, system: str, user: str) -> str:
        messages = [
            self._SystemMessage(content=system),
            self._HumanMessage(content=user),
        ]
        response = self._chat.invoke(messages)
        return (response.content or "").strip()


class HeuristicLLMProvider(BaseLLMProvider):
    """Rule-based fallback when no API key is configured."""

    name = "heuristic"

    def invoke(self, system: str, user: str) -> str:
        mock = MockLLMProvider()
        return mock.invoke(system, user)


def _parse_json_model(raw: str, model: Type[T]) -> T:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise ValueError("LLM did not return valid JSON") from None
        data = json.loads(match.group())
    return model.model_validate(data)


def resolve_provider() -> BaseLLMProvider:
    forced = (os.getenv("LLM_PROVIDER") or settings.LLM_PROVIDER or "auto").lower()
    if forced == "mock":
        return MockLLMProvider()
    if forced == "openai":
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("LLM_PROVIDER=openai but OPENAI_API_KEY is not set")
        return OpenAILLMProvider()
    if settings.OPENAI_API_KEY:
        try:
            return OpenAILLMProvider()
        except Exception:
            return HeuristicLLMProvider()
    return HeuristicLLMProvider()


_provider: Optional[BaseLLMProvider] = None


def get_llm_provider() -> BaseLLMProvider:
    global _provider
    if _provider is None:
        _provider = resolve_provider()
    return _provider


def reset_llm_provider() -> None:
    """Clear cached provider (for tests)."""
    global _provider
    _provider = None


def llm_status() -> dict[str, Any]:
    provider = get_llm_provider()
    return {
        "llm_available": True,
        "provider": provider.name,
        "model": settings.LLM_MODEL if provider.name == "openai" else None,
        "openai_configured": bool(settings.OPENAI_API_KEY),
    }
