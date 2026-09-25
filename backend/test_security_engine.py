from security_engine import run_basic_assessment


target = "https://example.com"

result = run_basic_assessment(target)

print("\n===== CyberGuard AI Security Assessment =====")
print(f"Status: {result.get('status')}")
print(f"Target: {result.get('target')}")
print(f"HTTP Status: {result.get('http_status')}")
print(f"Security Score: {result.get('security_score')}")

print("\n----- Findings -----")

for finding in result.get("findings", []):
    finding_name = finding.get(
        "header",
        finding.get("name", "Unknown Check")
    )

    print(
        f"[{finding.get('severity', 'info').upper()}] "
        f"{finding_name} - "
        f"{finding.get('status', 'unknown')}"
    )