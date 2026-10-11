import httpx
import pytest
import backend.security_engine as engine


class FakeSocket:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class FakeTLSSocket(FakeSocket):
    def __init__(self, certificate):
        self.certificate = certificate

    def getpeercert(self):
        return self.certificate


class FakeSSLContext:
    def __init__(self, certificate):
        self.certificate = certificate

    def wrap_socket(self, raw_socket, server_hostname):
        return FakeTLSSocket(self.certificate)


@pytest.fixture
def https_response():
    request = httpx.Request("GET", "https://example.com/")
    return httpx.Response(200, request=request)


def configure_certificate(monkeypatch, certificate):
    monkeypatch.setattr(
        engine,
        "safe_socket_connect",
        lambda host, port, timeout=5: FakeSocket(),
    )
    monkeypatch.setattr(
        engine.httpx,
        "create_ssl_context",
        lambda: FakeSSLContext(certificate),
    )


def test_unexpired_certificate_is_reported_valid(monkeypatch, https_response):
    configure_certificate(monkeypatch, {"notAfter": "Jan  1 00:00:00 2099 GMT"})
    findings = engine.analyze_certificate(https_response)
    assert findings[0]["title"] == "Certificate Expiry - valid"
    assert "2099" in findings[0]["description"]


def test_expired_certificate_is_reported_expired(monkeypatch, https_response):
    configure_certificate(monkeypatch, {"notAfter": "Jan  1 00:00:00 2000 GMT"})
    findings = engine.analyze_certificate(https_response)
    assert findings[0]["title"] == "Certificate Expiry - expired"
    assert findings[0]["severity"] == "HIGH"


def test_missing_expiry_is_reported_unavailable(monkeypatch, https_response):
    configure_certificate(monkeypatch, {})
    findings = engine.analyze_certificate(https_response)
    assert findings[0]["title"] == "Certificate Expiry - unavailable"


def test_tls_connection_failure_is_reported_unavailable(monkeypatch, https_response):
    def fail_connection(host, port, timeout=5):
        raise OSError("Simulated TLS connection failure")

    monkeypatch.setattr(engine, "safe_socket_connect", fail_connection)
    findings = engine.analyze_certificate(https_response)
    assert findings[0]["title"] == "Certificate Expiry - unavailable"


def test_http_target_skips_certificate_check():
    request = httpx.Request("GET", "http://example.com/")
    response = httpx.Response(200, request=request)
    assert engine.analyze_certificate(response) == []
