
import ipaddress
import socket
from typing import Iterable

import httpcore
import httpx
from httpcore import ConnectError, ConnectTimeout
from httpcore._backends.sync import SyncBackend, SyncStream
from httpx._transports.default import (
    ResponseStream,
    map_httpcore_exceptions,
)


def _resolve_public_addresses(host: str, port: int):
    """Resolve a host and reject the entire result if any address is unsafe."""
    try:
        results = socket.getaddrinfo(
            host,
            port,
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as exc:
        raise OSError("The target hostname could not be resolved.") from exc

    if not results:
        raise OSError("The target hostname returned no addresses.")

    validated = []

    # Validate every DNS answer before opening any socket.
    for family, socktype, proto, _canonname, sockaddr in results:
        try:
            address = ipaddress.ip_address(sockaddr[0])
        except ValueError as exc:
            raise OSError("DNS returned an invalid IP address.") from exc

        if not address.is_global:
            raise OSError(
                "Connection blocked: target resolves to a non-public IP."
            )

        if family not in (socket.AF_INET, socket.AF_INET6):
            continue

        validated.append((family, socktype, proto, sockaddr))

    if not validated:
        raise OSError("No supported public IP addresses were found.")

    return validated


def safe_socket_connect(
    host: str,
    port: int,
    timeout: float = 5.0,
    local_address: str | None = None,
) -> socket.socket:
    """Connect directly to a validated IP, never re-resolving at connect time."""
    addresses = _resolve_public_addresses(host, port)
    last_error = None

    for family, socktype, proto, sockaddr in addresses:
        sock = None

        try:
            sock = socket.socket(family, socktype, proto)
            sock.settimeout(timeout)

            if local_address is not None:
                if family == socket.AF_INET6:
                    sock.bind((local_address, 0, 0, 0))
                else:
                    sock.bind((local_address, 0))

            sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            sock.connect(sockaddr)

            connected_socket = sock
            sock = None
            return connected_socket

        except OSError as exc:
            last_error = exc
        finally:
            if sock is not None:
                sock.close()

    raise OSError("Could not connect to any validated public IP.") from last_error


class SafeNetworkBackend(SyncBackend):
    """HTTPCore backend that blocks non-public destinations."""

    def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options=None,
    ):
        try:
            addresses = _resolve_public_addresses(host, port)
        except OSError as exc:
            raise ConnectError(str(exc)) from exc

        last_error = None

        for family, socktype, proto, sockaddr in addresses:
            sock = None

            try:
                sock = socket.socket(family, socktype, proto)

                if timeout is not None:
                    sock.settimeout(timeout)

                if local_address is not None:
                    if family == socket.AF_INET6:
                        sock.bind((local_address, 0, 0, 0))
                    else:
                        sock.bind((local_address, 0))

                if socket_options:
                    for option in socket_options:
                        sock.setsockopt(*option)

                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                sock.connect(sockaddr)

                stream = SyncStream(sock)
                sock = None
                return stream

            except socket.timeout as exc:
                last_error = ConnectTimeout(
                    "Connection to a validated IP timed out."
                )
            except OSError as exc:
                last_error = ConnectError(
                    "Could not connect to a validated public IP."
                )
            finally:
                if sock is not None:
                    sock.close()

        if last_error is not None:
            raise last_error

        raise ConnectError("Could not connect to a validated public IP.")


class SafeHTTPTransport(httpx.BaseTransport):
    """HTTPX transport using SafeNetworkBackend and normal TLS verification."""

    def __init__(
        self,
        verify: bool = True,
        limits: httpx.Limits | None = None,
        http1: bool = True,
        http2: bool = False,
    ):
        limits = limits or httpx.Limits()
        ssl_context = httpx.create_ssl_context(
            verify=verify,
            trust_env=False,
        )

        self._pool = httpcore.ConnectionPool(
            ssl_context=ssl_context,
            max_connections=limits.max_connections,
            max_keepalive_connections=limits.max_keepalive_connections,
            keepalive_expiry=limits.keepalive_expiry,
            http1=http1,
            http2=http2,
            network_backend=SafeNetworkBackend(),
        )

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        core_request = httpcore.Request(
            method=request.method,
            url=httpcore.URL(
                scheme=request.url.raw_scheme,
                host=request.url.raw_host,
                port=request.url.port,
                target=request.url.raw_path,
            ),
            headers=request.headers.raw,
            content=request.stream,
            extensions=request.extensions,
        )

        with map_httpcore_exceptions():
            response = self._pool.handle_request(core_request)

        return httpx.Response(
            status_code=response.status,
            headers=response.headers,
            stream=ResponseStream(response.stream),
            extensions=response.extensions,
        )

    def close(self) -> None:
        self._pool.close()
