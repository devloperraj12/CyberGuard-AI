
import socket
from unittest.mock import patch

import pytest

from backend.security_engine import validate_target_url


def test_rejects_hostname_if_any_resolved_ip_is_private():
    fake_dns_result = [
        (
            socket.AF_INET,
            socket.SOCK_STREAM,
            6,
            "",
            ("93.184.216.34", 80),
        ),
        (
            socket.AF_INET,
            socket.SOCK_STREAM,
            6,
            "",
            ("192.168.1.10", 80),
        ),
    ]

    with patch(
        "backend.security_engine.socket.getaddrinfo",
        return_value=fake_dns_result,
    ):
        with pytest.raises(ValueError):
            validate_target_url("http://rebind-test.example")
