import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import httpx


SECURITY_HEADERS = {
    "Strict-Transport-Security": {
        "severity": "HIGH",
        "description": "HSTS helps prevent protocol downgrade attacks and cookie hijacking.",
        "recommendation": "Add a Strict-Transport-Security header with an appropriate max-age.",
    },
    "Content-Security-Policy": {
        "severity": "HIGH",
        "description": "CSP helps reduce the risk of cross-site scripting and other content injection attacks.",
        "recommendation": "Define a restrictive Content-Security-Policy appropriate for the application.",
    },
    "X-Content-Type-Options": {
        "severity": "MEDIUM",
        "description": "This header prevents browsers from MIME-sniffing responses.",
        "recommendation": "Set X-Content-Type-Options to nosniff.",
    },
    "X-Frame-Options": {
        "severity": "MEDIUM",
        "description": "This header helps protect against clickjacking.",
        "recommendation": "Set X-Frame-Options to DENY or SAMEORIGIN as appropriate.",
    },
    "Referrer-Policy": {
        "severity": "LOW",
        "description": "Referrer-Policy controls how much referrer information browsers send.",
        "recommendation": "Set a restrictive Referrer-Policy such as strict-origin-when-cross-origin.",
    },
}


MAX_REDIRECTS = 5


def validate_target_url(target_url: str) -> str:
    """
    Validate that a target is an HTTP/HTTPS URL and does not resolve
    to localhost, private, reserved, loopback, link-local, multicast,
    or unspecified IP addresses.
    """

    parsed = urlparse(target_url)

    if parsed.scheme.lower() not in {"http", "https"}:
        raise ValueError(
            "Only HTTP and HTTPS targets are supported."
        )

    if not parsed.hostname:
        raise ValueError(
            "The target URL must contain a valid hostname."
        )

    if parsed.username or parsed.password:
        raise ValueError(
            "URLs containing embedded usernames or passwords are not allowed."
        )

    hostname = parsed.hostname.strip().lower()

    if not hostname:
        raise ValueError(
            "The target hostname is empty."
        )

    blocked_hostnames = {
        "localhost",
        "localhost.localdomain",
        "ip6-localhost",
        "ip6-loopback",
    }

    if hostname in blocked_hostnames:
        raise ValueError(
            "Localhost and loopback targets are not allowed."
        )

    try:
        ip = ipaddress.ip_address(hostname)
        _validate_ip_address(ip)
        return target_url

    except ValueError as exc:
        try:
            ipaddress.ip_address(hostname)
        except ValueError:
            pass
        else:
            raise exc

    try:
        address_info = socket.getaddrinfo(
            hostname,
            parsed.port
            or (443 if parsed.scheme.lower() == "https" else 80),
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as exc:
        raise ValueError(
            "The target hostname could not be resolved."
        ) from exc

    resolved_ips = {
        result[4][0]
        for result in address_info
        if result[4]
    }

    if not resolved_ips:
        raise ValueError(
            "The target hostname did not resolve to an IP address."
        )

    for resolved_ip in resolved_ips:
        try:
            ip = ipaddress.ip_address(resolved_ip)
        except ValueError as exc:
            raise ValueError(
                "The target hostname resolved to an invalid IP address."
            ) from exc

        _validate_ip_address(ip)

    return target_url


def _validate_ip_address(
    ip: ipaddress.IPv4Address | ipaddress.IPv6Address,
) -> None:
    """
    Reject network ranges that should not be accessed by a
    public security scanner.
    """

    if ip.is_loopback:
        raise ValueError(
            "Loopback targets are not allowed."
        )

    if ip.is_private:
        raise ValueError(
            "Private network targets are not allowed."
        )

    if ip.is_link_local:
        raise ValueError(
            "Link-local targets are not allowed."
        )

    if ip.is_reserved:
        raise ValueError(
            "Reserved IP targets are not allowed."
        )

    if ip.is_multicast:
        raise ValueError(
            "Multicast targets are not allowed."
        )

    if ip.is_unspecified:
        raise ValueError(
            "Unspecified IP targets are not allowed."
        )


def validate_redirect_target(
    base_url: str,
    location: str,
) -> str:
    """
    Resolve and validate a redirect destination.

    Relative redirects are resolved against the current URL.
    Absolute redirect destinations are validated directly.
    """

    if not location.strip():
        raise ValueError(
            "The redirect destination is empty."
        )

    redirect_url = urljoin(
        base_url,
        location.strip(),
    )

    return validate_target_url(redirect_url)


def analyze_security_headers(
    headers: httpx.Headers,
) -> list[dict]:
    findings = []

    for header_name, config in SECURITY_HEADERS.items():
        if header_name not in headers:
            findings.append(
                {
                    "severity": config["severity"],
                    "title": f"{header_name} - missing",
                    "description": config["description"],
                    "recommendation": config["recommendation"],
                }
            )

    return findings


def analyze_tls(
    response: httpx.Response,
) -> list[dict]:
    findings = []

    if response.url.scheme.lower() == "https":
        findings.append(
            {
                "severity": "INFO",
                "title": "HTTPS - present",
                "description": "The target is using HTTPS.",
                "recommendation": "Continue using HTTPS across the application.",
            }
        )

        try:
            hostname = response.url.host

            if hostname:
                port = response.url.port or 443
                context = httpx.create_ssl_context()

                with socket.create_connection(
                    (hostname, port),
                    timeout=5,
                ) as raw_socket:
                    with context.wrap_socket(
                        raw_socket,
                        server_hostname=hostname,
                    ) as tls_socket:
                        tls_version = tls_socket.version()

                findings.append(
                    {
                        "severity": "INFO",
                        "title": "TLS Version - present",
                        "description": (
                            f"The connection negotiated {tls_version}."
                        ),
                        "recommendation": (
                            "Use modern TLS versions and disable obsolete protocols."
                        ),
                    }
                )

        except Exception:
            findings.append(
                {
                    "severity": "INFO",
                    "title": "TLS Version - unavailable",
                    "description": (
                        "The scanner could not determine the negotiated TLS version."
                    ),
                    "recommendation": (
                        "Verify that the server supports modern TLS configurations."
                    ),
                }
            )

    else:
        findings.append(
            {
                "severity": "HIGH",
                "title": "HTTPS - not used",
                "description": "The target is not using HTTPS.",
                "recommendation": "Serve the application over HTTPS.",
            }
        )

    return findings


def analyze_certificate(
    response: httpx.Response,
) -> list[dict]:
    findings = []

    if response.url.scheme.lower() != "https":
        return findings

    try:
        hostname = response.url.host

        if not hostname:
            return findings

        port = response.url.port or 443
        context = httpx.create_ssl_context()

        with socket.create_connection(
            (hostname, port),
            timeout=5,
        ) as raw_socket:
            with context.wrap_socket(
                raw_socket,
                server_hostname=hostname,
            ) as tls_socket:
                certificate = tls_socket.getpeercert()

        if certificate:
            findings.append(
                {
                    "severity": "INFO",
                    "title": "Certificate Expiry - valid",
                    "description": (
                        "A TLS certificate was successfully retrieved."
                    ),
                    "recommendation": (
                        "Continue monitoring certificate validity and renewal."
                    ),
                }
            )

    except Exception:
        findings.append(
            {
                "severity": "INFO",
                "title": "Certificate Expiry - unavailable",
                "description": (
                    "The scanner could not retrieve certificate expiry information."
                ),
                "recommendation": (
                    "Verify TLS certificate configuration manually."
                ),
            }
        )

    return findings


def analyze_cookie_security(
    headers: httpx.Headers,
) -> list[dict]:
    findings = []

    set_cookie_headers = headers.get_list("set-cookie")

    if not set_cookie_headers:
        findings.append(
            {
                "severity": "INFO",
                "title": "Cookies - not_detected",
                "description": (
                    "No Set-Cookie headers were detected in the response."
                ),
                "recommendation": (
                    "If authentication cookies are used, configure "
                    "Secure, HttpOnly, and SameSite appropriately."
                ),
            }
        )

        return findings

    for cookie_header in set_cookie_headers:
        cookie_name = cookie_header.split("=", 1)[0].strip()
        cookie_lower = cookie_header.lower()

        if "secure" not in cookie_lower:
            findings.append(
                {
                    "severity": "MEDIUM",
                    "title": (
                        f"Cookie {cookie_name} - Secure flag missing"
                    ),
                    "description": (
                        "The cookie does not appear to include the Secure attribute."
                    ),
                    "recommendation": (
                        "Set the Secure attribute on sensitive cookies."
                    ),
                }
            )

        if "httponly" not in cookie_lower:
            findings.append(
                {
                    "severity": "MEDIUM",
                    "title": (
                        f"Cookie {cookie_name} - HttpOnly flag missing"
                    ),
                    "description": (
                        "The cookie does not appear to include the HttpOnly attribute."
                    ),
                    "recommendation": (
                        "Set HttpOnly on cookies that do not need "
                        "client-side JavaScript access."
                    ),
                }
            )

        if "samesite" not in cookie_lower:
            findings.append(
                {
                    "severity": "LOW",
                    "title": (
                        f"Cookie {cookie_name} - SameSite attribute missing"
                    ),
                    "description": (
                        "The cookie does not appear to specify a SameSite policy."
                    ),
                    "recommendation": (
                        "Set an appropriate SameSite policy such as Lax or Strict."
                    ),
                }
            )

    return findings


def analyze_information_disclosure(
    headers: httpx.Headers,
) -> list[dict]:
    findings = []

    server_header = headers.get("server")
    powered_by_header = headers.get("x-powered-by")

    if server_header:
        findings.append(
            {
                "severity": "INFO",
                "title": "Server Header - disclosed",
                "description": (
                    f"The response exposes a Server header: {server_header}."
                ),
                "recommendation": (
                    "Consider minimizing unnecessary server implementation "
                    "details in production responses."
                ),
            }
        )

    if powered_by_header:
        findings.append(
            {
                "severity": "INFO",
                "title": "X-Powered-By Header - disclosed",
                "description": (
                    "The response exposes an X-Powered-By header: "
                    f"{powered_by_header}."
                ),
                "recommendation": (
                    "Remove framework or runtime identification headers "
                    "when they are not required."
                ),
            }
        )

    return findings


def analyze_cors(
    headers: httpx.Headers,
) -> list[dict]:
    findings = []

    allow_origin = headers.get(
        "access-control-allow-origin"
    )

    allow_credentials = headers.get(
        "access-control-allow-credentials"
    )

    if allow_origin:
        if allow_origin.strip() == "*":
            findings.append(
                {
                    "severity": "LOW",
                    "title": "CORS - wildcard origin",
                    "description": (
                        "The response allows requests from any origin through "
                        "Access-Control-Allow-Origin: *."
                    ),
                    "recommendation": (
                        "Use an explicit allowlist of trusted origins when "
                        "cross-origin access needs to be restricted."
                    ),
                }
            )
        else:
            findings.append(
                {
                    "severity": "INFO",
                    "title": "CORS - explicit origin",
                    "description": (
                        "The response specifies an explicit CORS origin: "
                        f"{allow_origin}."
                    ),
                    "recommendation": (
                        "Verify that the configured origin is intentionally trusted."
                    ),
                }
            )

    if (
        allow_credentials
        and allow_credentials.lower().strip() == "true"
        and allow_origin == "*"
    ):
        findings.append(
            {
                "severity": "MEDIUM",
                "title": "CORS - wildcard origin with credentials",
                "description": (
                    "The response advertises credentials together with "
                    "a wildcard CORS origin configuration."
                ),
                "recommendation": (
                    "Use explicit trusted origins for credentialed "
                    "cross-origin requests."
                ),
            }
        )

    return findings


def analyze_http_methods(
    client: httpx.Client,
    target_url: str,
) -> list[dict]:
    findings = []

    try:
        response = client.options(target_url)

        allow_header = response.headers.get("allow")

        if allow_header:
            methods = [
                method.strip().upper()
                for method in allow_header.split(",")
                if method.strip()
            ]

            findings.append(
                {
                    "severity": "INFO",
                    "title": "HTTP Methods - advertised",
                    "description": (
                        "The target advertises the following HTTP methods: "
                        + ", ".join(methods)
                    ),
                    "recommendation": (
                        "Ensure only required HTTP methods are enabled."
                    ),
                }
            )

            if "TRACE" in methods:
                findings.append(
                    {
                        "severity": "MEDIUM",
                        "title": "TRACE Method - enabled",
                        "description": (
                            "The target advertises the HTTP TRACE method."
                        ),
                        "recommendation": (
                            "Disable TRACE unless it is explicitly required."
                        ),
                    }
                )

        elif response.status_code not in {
            400,
            401,
            403,
            404,
            405,
            501,
        }:
            findings.append(
                {
                    "severity": "INFO",
                    "title": "HTTP Methods - no Allow header",
                    "description": (
                        "The server responded to the OPTIONS request "
                        "without advertising an Allow header."
                    ),
                    "recommendation": (
                        "Review supported HTTP methods and ensure unnecessary "
                        "methods are disabled."
                    ),
                }
            )

    except Exception:
        findings.append(
            {
                "severity": "INFO",
                "title": "HTTP Methods - unavailable",
                "description": (
                    "The scanner could not determine the advertised HTTP methods."
                ),
                "recommendation": (
                    "Review the server's supported HTTP methods manually."
                ),
            }
        )

    return findings


def calculate_security_score(
    findings: list[dict],
) -> int:
    score = 100

    penalties = {
        "HIGH": 15,
        "MEDIUM": 8,
        "LOW": 4,
        "INFO": 0,
    }

    for finding in findings:
        severity = finding.get(
            "severity",
            "INFO",
        ).upper()

        score -= penalties.get(
            severity,
            0,
        )

    return max(
        0,
        min(
            100,
            score,
        ),
    )


def fetch_with_safe_redirects(
    client: httpx.Client,
    target_url: str,
) -> httpx.Response:
    """
    Fetch a target without allowing redirects to bypass SSRF protection.

    Every redirect destination is validated before a request is made.
    """

    current_url = validate_target_url(target_url)
    visited_urls: set[str] = set()

    for redirect_number in range(MAX_REDIRECTS + 1):
        if current_url in visited_urls:
            raise ValueError(
                "The target returned a redirect loop."
            )

        visited_urls.add(current_url)

        response = client.get(
            current_url,
            follow_redirects=False,
        )

        if response.status_code not in {
            301,
            302,
            303,
            307,
            308,
        }:
            return response

        location = response.headers.get("location")

        if not location:
            raise ValueError(
                "The target returned a redirect without a destination."
            )

        next_url = validate_redirect_target(
            current_url,
            location,
        )

        current_url = next_url

        if redirect_number >= MAX_REDIRECTS:
            raise ValueError(
                "The target exceeded the maximum allowed redirect count."
            )

    raise ValueError(
        "The target exceeded the maximum allowed redirect count."
    )


def run_basic_assessment(
    target_url: str,
) -> dict:
    """
    Run a safe, non-destructive security assessment.

    Only authorized targets should be scanned.
    """

    target_url = validate_target_url(
        target_url
    )

    findings: list[dict] = []

    timeout = httpx.Timeout(
        connect=5.0,
        read=10.0,
        write=10.0,
        pool=5.0,
    )

    with httpx.Client(
        timeout=timeout,
        headers={
            "User-Agent": "CyberGuard-AI-Security-Scanner/1.0",
        },
    ) as client:

        response = fetch_with_safe_redirects(
            client,
            target_url,
        )

        findings.extend(
            analyze_security_headers(
                response.headers
            )
        )

        findings.extend(
            analyze_tls(response)
        )

        findings.extend(
            analyze_certificate(response)
        )

        findings.extend(
            analyze_cookie_security(
                response.headers
            )
        )

        findings.extend(
            analyze_information_disclosure(
                response.headers
            )
        )

        findings.extend(
            analyze_cors(
                response.headers
            )
        )

        findings.extend(
            analyze_http_methods(
                client,
                str(response.url),
            )
        )

        score = calculate_security_score(
            findings
        )

        return {
            "status": "completed",
            "target": str(response.url),
            "http_status": response.status_code,
            "security_score": score,
            "findings": findings,
            "message": (
                "Basic security assessment completed successfully."
            ),
        }