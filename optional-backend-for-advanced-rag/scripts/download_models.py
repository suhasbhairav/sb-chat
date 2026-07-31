import os


def main() -> None:
    model_name = os.getenv("BATUK_GLINER_MODEL", "urchade/gliner_multi_pii-v1")
    if os.getenv("BATUK_SKIP_MODEL_DOWNLOAD", "").lower() in {"1", "true", "yes"}:
        print("Skipping GLiNER model download.")
        return

    try:
        from gliner import GLiNER

        GLiNER.from_pretrained(model_name)
        print(f"Downloaded GLiNER model: {model_name}")
    except Exception as exc:
        print(f"GLiNER model download skipped: {exc}")


if __name__ == "__main__":
    main()
