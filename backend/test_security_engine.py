from backend.security_engine import run_basic_assessment


def main() -> None:
    target = "https://example.com"

    result = run_basic_assessment(target)

    print("\n===== CyberGuard AI Security Assessment =====")
    print(f"Status: {result['status']}")
    print(f"Target: {result['target']}")
    print(f"HTTP Status: {result['http_status']}")
    print(f"Security Score: {result['security_score']}")

    print("\n----- Category Scores -----")

    for category, score in result.get("category_scores", {}).items():
        print(f"{category}: {score}/100")

    print("\n----- Findings -----")

    for finding in result["findings"]:
        print(
            f"[{finding['severity']}] "
            f"{finding['title']} - "
            f"{finding['description']}"
        )


if __name__ == "__main__":
    main()