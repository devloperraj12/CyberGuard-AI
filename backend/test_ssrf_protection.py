
import socket
from unittest.mock import Mock, patch

import pytest

from backend.security_engine import (
    fetch_with_safe_redirects,
    validate_redirect_target,
    validate_target_url,
)


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost",
        "http://localhost.localdomain",
        "http://127.0.0.1",
        "http://127.0.0.1:8000",
        "http://10.0.0.1",
        "http://172.16.0.1",
        "http://192.168.1.1",
        "http://169.254.169.254",
        "http://[::1]",
        "http://0.0.0.0",
    ],
)
def test_rejects_unsafe_ip_or_hostname(url):
    with pytest.raises(ValueError):
        validate_target_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "ftp://example.com",
        "http:///missing-host",
        "http://user:password@example.com",
    ],
)
def test_rejects_invalid_url(url):
    with pytest.raises(ValueError):
        validate_target_url(url)


def test_rejects_hostname_resolving_to_private_ip():
    fake_dns_result = [
        (
            socket.AF_INET,
            socket.SOCK_STREAM,
            6,
            "",
            ("192.168.1.10", 80),
        )
    ]

    with patch(
        "backend.security_engine.socket.getaddrinfo",
        return_value=fake_dns_result,
    ):
        with pytest.raises(ValueError):
            validate_target_url("http://internal.example")


def test_rejects_hostname_resolving_to_loopback():
    fake_dns_result = [
        (
            socket.AF_INET,
            socket.SOCK_STREAM,
            6,
            "",
            ("127.0.0.1", 80),
        )
    ]

    with patch(
        "backend.security_engine.socket.getaddrinfo",
        return_value=fake_dns_result,
    ):
        with pytest.raises(ValueError):
            validate_target_url("http://internal.example")


def test_rejects_redirect_to_localhost():
    with pytest.raises(ValueError):
        validate_redirect_target(
            "https://example.com",
            "http://localhost",
        )


def test_rejects_redirect_to_private_ip():
    with pytest.raises(ValueError):
        validate_redirect_target(
            "https://example.com",
            "http://192.168.1.1",
        )


def test_accepts_public_ip():
    with patch(
    "backend.security_engine.socket.getaddrinfo",
    side_effect=lambda hostname, *args, **kwargs: [
        (
            socket.AF_INET,
            socket.SOCK_STREAM,
            socket.IPPROTO_TCP,
            "",
            (
                "93.184.216.34"
                if hostname == "example.com"
                else "93.184.216.34",
                443 if hostname in {"example.com", "example.org"} else 80,
            ),
        )
    ],
):
        assert (
            validate_target_url("https://8.8.8.8")
            == "https://8.8.8.8"
        )


def test_rejects_unresolvable_hostname():
    with patch(
        "backend.security_engine.socket.getaddrinfo",
        side_effect=socket.gaierror("Name resolution failed"),
    ):
        with pytest.raises(ValueError):
            validate_target_url("https://unresolvable.example")


def test_fetch_blocks_redirect_to_localhost_before_request():
    client = Mock()
    response = Mock()
    response.status_code = 302
    response.headers = {
        "location": "http://127.0.0.1:8000/admin"
    }
    client.get.return_value = response

    with patch(
    "backend.security_engine.socket.getaddrinfo",
    return_value=[
        (
            socket.AF_INET,
            socket.SOCK_STREAM,
            socket.IPPROTO_TCP,
            "",
            ("93.184.216.34", 443),
        )
    ],
):
        with pytest.raises(ValueError):
            fetch_with_safe_redirects(
                client,
                "https://example.com/",
            )

    assert client.get.call_count == 1


def test_fetch_blocks_redirect_to_private_ip_before_request():
    client = Mock()
    response = Mock()
    response.status_code = 302
    response.headers = {
        "location": "http://192.168.1.1/"
    }
    client.get.return_value = response

    with patch(
    "backend.security_engine.socket.getaddrinfo",
    return_value=[
        (
            socket.AF_INET,
            socket.SOCK_STREAM,
            socket.IPPROTO_TCP,
            "",
            ("93.184.216.34", 443),
        )
    ],
):
        with pytest.raises(ValueError):
            fetch_with_safe_redirects(
                client,
                "https://example.com/",
            )

    assert client.get.call_count == 1


def test_fetch_follows_validated_public_redirect():
    client = Mock()

    redirect_response = Mock()
    redirect_response.status_code = 302
    redirect_response.headers = {
        "location": "https://example.org/final"
    }

    final_response = Mock()
    final_response.status_code = 200
    final_response.headers = {}

    client.get.side_effect = [
        redirect_response,
        final_response,
    ]

    with patch(
    "backend.security_engine.socket.getaddrinfo",
    return_value=[
        (
            socket.AF_INET,
            socket.SOCK_STREAM,
            socket.IPPROTO_TCP,
            "",
            ("93.184.216.34", 443),
        )
    ],
):
        result = fetch_with_safe_redirects(
            client,
            "https://example.com/",
        )

    assert result.status_code == 200
    assert client.get.call_count == 2
    assert client.get.call_args_list[0].args[0] == (
        "https://example.com/"
    )
    assert client.get.call_args_list[1].args[0] == (
        "https://example.org/final"
    )
