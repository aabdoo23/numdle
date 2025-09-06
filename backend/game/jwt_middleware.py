from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser, User
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async


class JWTAuthMiddleware:
    """Simple Channels middleware that authenticates users via JWT passed as ?token=... in the WS URL."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        try:
            query_string = scope.get("query_string", b"").decode()
            params = parse_qs(query_string)
            tokens = params.get("token", [])
            if tokens:
                token = tokens[0]
                try:
                    access = AccessToken(token)
                    user_id = access.get("user_id")
                    if user_id:
                        try:
                            user = await self._get_user(user_id)
                            scope["user"] = user
                        except Exception:
                            scope["user"] = AnonymousUser()
                    else:
                        scope["user"] = AnonymousUser()
                except Exception:
                    scope["user"] = AnonymousUser()
            else:
                scope["user"] = AnonymousUser()
        except Exception:
            scope["user"] = AnonymousUser()
        return await self.inner(scope, receive, send)

    @staticmethod
    @database_sync_to_async
    def _get_user(user_id: int):
        return User.objects.get(id=user_id)
