"""Bounded public-web fetching with DNS pinned to a validated address."""
import ipaddress
import socket
from urllib.parse import urlsplit, urljoin, quote

import certifi
import urllib3

MAX_RESPONSE_BYTES = 2 * 1024 * 1024
MAX_REDIRECTS = 3


class JobFetchError(ValueError):
    """Safe, user-facing fetch failure."""


def _destination(url: str):
    try:
        if len(url) > 2048 or any(ord(c) < 33 for c in url) or "\\" in url:
            raise ValueError()
        parts = urlsplit(url)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            raise ValueError()
        if parts.username is not None or parts.password is not None:
            raise ValueError()
        host = parts.hostname.encode("idna").decode("ascii")
        port = parts.port or (443 if parts.scheme == "https" else 80)
        if port != (443 if parts.scheme == "https" else 80) or "%" in host:
            raise ValueError()
    except (ValueError, UnicodeError):
        raise JobFetchError("Use a public HTTP or HTTPS job URL on its standard port.") from None

    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)}
    except OSError:
        raise JobFetchError("Could not resolve the job website. Try pasting the description.") from None
    if not addresses or any(not _public_address(address) for address in addresses):
        raise JobFetchError("Job URLs must resolve only to public internet addresses.")
    return parts, host, port, sorted(addresses)[0]


def _public_address(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    # Reject transition/mapped forms that can hide an IPv4 destination.
    if isinstance(ip, ipaddress.IPv6Address) and (ip.ipv4_mapped or ip.sixtofour or ip.teredo):
        return False
    if isinstance(ip, ipaddress.IPv6Address) and any(ip in network for network in (
        ipaddress.ip_network("64:ff9b::/96"), ipaddress.ip_network("64:ff9b:1::/48"),
    )):
        return False  # NAT64 can translate an apparently global IPv6 address to private IPv4.
    return ip.is_global and not (ip.is_multicast or ip.is_reserved or ip.is_unspecified)


def fetch_job_html(url: str, headers: dict) -> bytes:
    for hop in range(MAX_REDIRECTS + 1):
        parts, host, port, address = _destination(url)
        if parts.scheme == "https":
            pool = urllib3.HTTPSConnectionPool(
                address, port, server_hostname=host, assert_hostname=host,
                cert_reqs="CERT_REQUIRED", ca_certs=certifi.where(),
            )
        else:
            pool = urllib3.HTTPConnectionPool(address, port)
        response = None
        try:
            path = quote(parts.path or "/", safe="/%:@!$&'()*+,;=-._~")
            if parts.query:
                path += "?" + quote(parts.query, safe="/%?:@!$&'()*+,;=-._~")
            authority = f"[{host}]" if ":" in host else host
            response = pool.urlopen(
                "GET", path, headers={**headers, "Host": authority, "Accept-Encoding": "identity"},
                redirect=False, retries=False, preload_content=False,
                timeout=urllib3.Timeout(connect=5, read=10),
            )
            if response.status in (301, 302, 303, 307, 308):
                location = response.headers.get("Location")
                if not location or hop == MAX_REDIRECTS:
                    raise JobFetchError("The job website redirected too many times or without a destination.")
                url = urljoin(url, location)
                continue
            if response.status < 200 or response.status >= 300:
                raise JobFetchError("The job website could not be fetched. Try pasting the description.")
            media_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
            if media_type not in ("text/html", "application/xhtml+xml", "text/plain"):
                raise JobFetchError("The job URL must return an HTML or text page.")
            if response.headers.get("Content-Encoding", "identity").lower() not in ("", "identity"):
                raise JobFetchError("The job website returned an unsupported compressed response.")
            body = response.read(MAX_RESPONSE_BYTES + 1, decode_content=False)
            if len(body) > MAX_RESPONSE_BYTES:
                raise JobFetchError("The job page is too large. Try pasting the description.")
            return body
        except urllib3.exceptions.HTTPError:
            raise JobFetchError("The job website could not be fetched securely. Try pasting the description.") from None
        finally:
            if response is not None:
                response.close()
            pool.close()
    raise JobFetchError("The job website redirected too many times.")
