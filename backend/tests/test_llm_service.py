import os

import pytest

from services.llm_service import MockLLMProvider, get_llm_provider, reset_llm_provider, resolve_provider


@pytest.fixture(autouse=True)
def _reset_provider():
    reset_llm_provider()
    yield
    reset_llm_provider()


def test_mock_provider_returns_json_for_insights():
    provider = MockLLMProvider()
    raw = provider.invoke("investment analyst", "executive diligence startup")
    assert "executive_summary" in raw
    assert "recommendation" in raw


def test_resolve_provider_forced_mock(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    reset_llm_provider()
    assert resolve_provider().name == "mock"


def test_get_llm_provider_cached():
    os.environ["LLM_PROVIDER"] = "mock"
    reset_llm_provider()
    assert get_llm_provider().name == "mock"
