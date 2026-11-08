def stream_events(chunks):
    """Preserve multiline tokens and distinguish completion from interruption."""
    try:
        for chunk in chunks:
            yield "\n".join("data: " + line for line in chunk.split("\n")) + "\n\n"
    except Exception:
        yield "event: error\ndata: The analysis stream was interrupted. Please try again.\n\n"
        return
    yield "data: [DONE]\n\n"
