from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser, User
from channels.db import database_sync_to_async
import re


class JWTAuthMiddleware:
    """Guest-only middleware with device identity.

    Accepts one of:
      - ?guest_id=<uuid>&name=<displayName>
      - (legacy) ?guest=<displayName>

    Internal auth_user.username becomes 'g:<guest_id>' while display name lives on Player.display_name.
    """

    GUEST_ID_RE = re.compile(r"^[a-fA-F0-9-]{8,36}$")

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        try:
            query_string = scope.get("query_string", b"").decode()
            params = parse_qs(query_string)
            guest_ids = params.get("guest_id", [])
            names = params.get("name", [])
            legacy = params.get("guest", [])  # legacy fallback

            user = None
            if guest_ids:
                raw_id = guest_ids[0][:36]
                if self.GUEST_ID_RE.match(raw_id):
                    internal_username = f"g:{raw_id}"[:150]
                    user = await self._get_or_create_guest(internal_username)
            elif legacy:
                # Fallback legacy mode
                legacy_name = legacy[0][:30]
                if legacy_name:
                    user = await self._get_or_create_guest(legacy_name)
            scope["user"] = user if user else AnonymousUser()
        except Exception:
            scope["user"] = AnonymousUser()
        return await self.inner(scope, receive, send)

    @staticmethod
    @database_sync_to_async
    def _get_or_create_guest(username: str):
        user, created = User.objects.get_or_create(username=username)
        if created:
            user.set_unusable_password()
            user.save(update_fields=['password'])
        return user
