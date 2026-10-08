import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple


def b64e(data: bytes) -> str:
    """URL-safe Base64 without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64d(value: str) -> bytes:
    """Decode URL-safe Base64."""
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode())


def encode_json(data: Dict) -> str:
    """Create a compact Base64URL encoded JSON section."""
    raw = json.dumps(data, separators=(",", ":"), sort_keys=True).encode()
    return b64e(raw)


def hmac_sha256(message: str, secret: str) -> str:
    """Create an HS256-compatible HMAC signature."""
    digest = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256,
    ).digest()
    return b64e(digest)


@dataclass
class User:
    user_id: str
    name: str
    email: str
    password_hash: str
    role: str


class DemoUserStore:
    """In-memory user store used only by this standalone prototype."""

    def __init__(self) -> None:
        self.users: Dict[str, User] = {}

    @staticmethod
    def hash_password(password: str) -> str:
        # Demonstration only. Production systems should use Argon2/bcrypt.
        return hashlib.sha256(password.encode()).hexdigest()

    def add_user(
        self,
        user_id: str,
        name: str,
        email: str,
        password: str,
        role: str = "patient",
    ) -> None:
        self.users[email.lower()] = User(
            user_id,
            name,
            email.lower(),
            self.hash_password(password),
            role,
        )

    def authenticate(
        self,
        email: str,
        password: str,
    ) -> Optional[User]:
        user = self.users.get(email.lower())

        if user is None:
            return None

        supplied = self.hash_password(password)

        if hmac.compare_digest(user.password_hash, supplied):
            return user

        return None


class JWTService:
    """Small HS256 JWT demonstration."""

    def __init__(self, secret: str, lifetime: int = 3600) -> None:
        self.secret = secret
        self.lifetime = lifetime

    def create_token(self, user: User) -> str:
        now = int(time.time())

        header = {
            "alg": "HS256",
            "typ": "JWT",
        }

        payload = {
            "sub": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "iat": now,
            "exp": now + self.lifetime,
        }

        header_part = encode_json(header)
        payload_part = encode_json(payload)
        unsigned = f"{header_part}.{payload_part}"
        signature = hmac_sha256(unsigned, self.secret)

        return f"{unsigned}.{signature}"

    def verify_token(self, token: str) -> Tuple[bool, str]:
        parts = token.split(".")

        if len(parts) != 3:
            return False, "Invalid token structure"

        header_part, payload_part, received = parts
        unsigned = f"{header_part}.{payload_part}"
        expected = hmac_sha256(unsigned, self.secret)

        if not hmac.compare_digest(received, expected):
            return False, "Invalid signature"

        try:
            header = json.loads(b64d(header_part))
            payload = json.loads(b64d(payload_part))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
            return False, "Invalid token encoding"

        if header.get("alg") != "HS256":
            return False, "Unsupported algorithm"

        expiry = payload.get("exp")

        if not isinstance(expiry, int):
            return False, "Missing expiry"

        if int(time.time()) >= expiry:
            return False, "Token expired"

        return True, json.dumps(payload, indent=2)


def title(text: str) -> None:
    print("\n" + "=" * 60)
    print(text)
    print("=" * 60)


def successful_login(store: DemoUserStore, jwt: JWTService) -> str:
    title("1. Successful Login")

    user = store.authenticate(
        "patient@example.com",
        "DemoPass123",
    )

    if user is None:
        print("Authentication failed.")
        return ""

    token = jwt.create_token(user)

    print("Authentication: SUCCESS")
    print(f"User: {user.name}")
    print(f"Role: {user.role}")
    print(f"JWT: {token[:65]}...")

    return token


def verify_demo(jwt: JWTService, token: str) -> None:
    title("2. Token Verification")

    valid, result = jwt.verify_token(token)
    print(f"Valid: {valid}")
    print("Payload/result:")
    print(result)


def wrong_password(store: DemoUserStore) -> None:
    title("3. Invalid Password")

    user = store.authenticate(
        "patient@example.com",
        "WrongPassword",
    )

    print("Rejected correctly." if user is None else "Unexpected success.")


def tampered_token(jwt: JWTService, token: str) -> None:
    title("4. Tampered Token")

    header, payload, signature = token.split(".")
    data = json.loads(b64d(payload))

    # Change a claim without changing the original signature.
    data["role"] = "admin"

    modified_payload = encode_json(data)
    tampered = f"{header}.{modified_payload}.{signature}"

    valid, reason = jwt.verify_token(tampered)

    print(f"Accepted: {valid}")
    print(f"Result: {reason}")


def expired_token(store: DemoUserStore) -> None:
    title("5. Expired Token")

    short_jwt = JWTService(
        "local-week-one-secret",
        lifetime=0,
    )

    user = store.authenticate(
        "patient@example.com",
        "DemoPass123",
    )

    if user is None:
        print("Demo authentication failed.")
        return

    token = short_jwt.create_token(user)
    time.sleep(1)

    valid, reason = short_jwt.verify_token(token)

    print(f"Accepted: {valid}")
    print(f"Result: {reason}")


def print_flow() -> None:
    title("Authentication Flow")

    flow = [
        "1. Receive email and password",
        "2. Find user in the local demo store",
        "3. Verify supplied credentials",
        "4. Create signed JWT after successful login",
        "5. Present JWT to a protected service",
        "6. Verify JWT signature",
        "7. Check expiry and claims",
        "8. Accept or reject the request",
    ]

    for item in flow:
        print(item)


def main() -> None:
    print("HealWithIndia - Week 01 JWT Prototype")
    print("Standalone demo: no project services are modified.")

    store = DemoUserStore()

    store.add_user(
        "HW001",
        "Demo Patient",
        "patient@example.com",
        "DemoPass123",
        "patient",
    )

    store.add_user(
        "HW002",
        "Demo Coordinator",
        "coordinator@example.com",
        "Coordinator123",
        "coordinator",
    )

    jwt = JWTService(
        "local-week-one-secret",
        lifetime=3600,
    )

    print_flow()

    token = successful_login(store, jwt)

    if token:
        verify_demo(jwt, token)
        tampered_token(jwt, token)

    wrong_password(store)
    expired_token(store)

    title("Prototype Complete")
    print("No frontend, database, Supabase project, or API was contacted.")
    print("Use a maintained security library for any real application.")


if __name__ == "__main__":
    main()
