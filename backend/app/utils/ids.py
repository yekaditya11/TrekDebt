from nanoid import generate


ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"


def generate_public_id(size: int = 10) -> str:
    """Generate a URL-safe public trip identifier."""
    return generate(ALPHABET, size)
