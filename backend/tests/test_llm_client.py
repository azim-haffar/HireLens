import importlib.util
from pathlib import Path
import sys
import unittest
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock, patch
from fastapi import HTTPException


class LLMClientTests(unittest.TestCase):
    def setUp(self):
        config = ModuleType("app.core.config")
        config.settings = SimpleNamespace(groq_api_key="synthetic-key")
        with patch.dict(sys.modules, {"app.core.config": config}), patch("groq.Groq", return_value=MagicMock()):
            spec = importlib.util.spec_from_file_location("tested_groq_client", Path(__file__).parents[1]/"app/core/groq_client.py")
            self.module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.module)

    def test_provider_failure_is_sanitized(self):
        self.module.client.chat.completions.create.side_effect = RuntimeError("secret provider detail")
        with self.assertRaises(HTTPException) as error:
            self.module.chat([{"role":"user", "content":"synthetic"}])
        self.assertEqual(error.exception.status_code, 503)
        self.assertNotIn("secret", error.exception.detail)

    def test_partial_stream_never_replays_through_fallback(self):
        def broken():
            yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="partial"))])
            raise RuntimeError("secret detail")
        self.module.client.chat.completions.create.return_value = broken()
        stream = self.module.stream([])
        self.assertEqual(next(stream), "partial")
        with self.assertRaises(RuntimeError): next(stream)
        self.module.client.chat.completions.create.assert_called_once()

    def test_fallback_before_first_token_is_allowed(self):
        chunk = SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="synthetic"))])
        self.module.client.chat.completions.create.side_effect = [RuntimeError("unavailable"), iter([chunk])]
        self.assertEqual(list(self.module.stream([])), ["synthetic"])
        self.assertEqual(self.module.client.chat.completions.create.call_count, 2)
