
import socket
from unittest.mock import Mock, patch

import pytest
from httpcore import ConnectError
import httpx

from backend.safe_network import SafeHTTPTransport

from backend.safe_network import SafeNetworkBackend


def dns_result(ip_address, family=socket.AF_INET):
    if family == socket.AF_INET6:
        sockaddr = (ip_address, 443, 0, 0)
    else:
        sockaddr = (ip_address, 443)

    return (
        family,
        socket.SOCK_STREAM,
        socket.IPPROTO_TCP,
        "",
        sockaddr,
    )


@pytest.mark.parametrize(
    "ip_address",
    [
        "127.0.0.1",
        "10.0.0.1",
        "172.16.0.1",
        "192.168.1.1",
        "169.254.169.254",
        "::1",
        "fe80::1",
        "fc00::1",
        "0.0.0.0",
    ],
)
def test_blocks_non_public_dns_results(ip_address):
    family = (
        socket.AF_INET6 if ":" in ip_address else socket.AF_INET
    )

    with patch(
        "backend.safe_network.socket.getaddrinfo",
        return_value=[dns_result(ip_address, family)],
    ), patch(
        "backend.safe_network.socket.socket"
    ) as socket_factory:
        with pytest.raises(ConnectError):
            SafeNetworkBackend().connect_tcp("example.test", 443)

        socket_factory.assert_not_called()


def test_blocks_mixed_public_and_private_dns_results():
    results = [
        dns_result("93.184.216.34"),
        dns_result("192.168.1.10"),
    ]

    with patch(
        "backend.safe_network.socket.getaddrinfo",
        return_value=results,
    ), patch(
        "backend.safe_network.socket.socket"
    ) as socket_factory:
        with pytest.raises(ConnectError):
            SafeNetworkBackend().connect_tcp("example.test", 443)

        socket_factory.assert_not_called()


def test_connects_to_validated_sockaddr_without_hostname_lookup():
    result = dns_result("93.184.216.34")
    fake_socket = Mock()

    with patch(
        "backend.safe_network.socket.getaddrinfo",
        return_value=[result],
    ), patch(
        "backend.safe_network.socket.socket",
        return_value=fake_socket,
    ), patch(
        "backend.safe_network.SyncStream",
        side_effect=lambda sock: ("connected", sock),
    ) as stream_factory:
        connected = SafeNetworkBackend().connect_tcp(
            "example.test",
            443,
            timeout=5,
        )

    assert connected[0] == "connected"
    fake_socket.connect.assert_called_once_with(("93.184.216.34", 443))
    stream_factory.assert_called_once_with(fake_socket)


def test_dns_failure_is_rejected():
    with patch(
        "backend.safe_network.socket.getaddrinfo",
        side_effect=socket.gaierror("DNS failed"),
    ):
        with pytest.raises(ConnectError):
            SafeNetworkBackend().connect_tcp("missing.example", 443)

def test_http_transport_uses_safe_network_backend():
    transport = SafeHTTPTransport()

    try:
        assert isinstance(
            transport._pool._network_backend,
            SafeNetworkBackend,
        )
    finally:
        transport.close()


def test_http_transport_blocks_private_dns_before_socket_creation():
    results = [dns_result("127.0.0.1")]

    with patch(
        "backend.safe_network.socket.getaddrinfo",
        return_value=results,
    ), patch(
        "backend.safe_network.socket.socket"
    ) as socket_factory:
        transport = SafeHTTPTransport()

        try:
            with httpx.Client(
                transport=transport,
                trust_env=False,
                follow_redirects=False,
            ) as client:
                with pytest.raises(httpx.ConnectError):
                    client.get("https://example.test/")
        finally:
            transport.close()

        socket_factory.assert_not_called()


def test_http_transport_blocks_mixed_public_and_private_dns():
    results = [
        dns_result("93.184.216.34"),
        dns_result("10.0.0.1"),
    ]

    with patch(
        "backend.safe_network.socket.getaddrinfo",
        return_value=results,
    ), patch(
        "backend.safe_network.socket.socket"
    ) as socket_factory:
        transport = SafeHTTPTransport()

        try:
            with httpx.Client(
                transport=transport,
                trust_env=False,
                follow_redirects=False,
            ) as client:
                with pytest.raises(httpx.ConnectError):
                    client.get("https://example.test/")
        finally:
            transport.close()

        socket_factory.assert_not_called()
