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
                # Fallback: allow guest username via query parameter
                guests = params.get("guest", [])
                if guests:
                    username = guests[0]
                    try:
                        user = await self._get_user_by_username(username)
                    except Exception:
                        user = await self._create_guest_user(username)
                    scope["user"] = user
                else:
                    scope["user"] = AnonymousUser()
        except Exception:
            scope["user"] = AnonymousUser()
        return await self.inner(scope, receive, send)

    @staticmethod
    @database_sync_to_async
    def _get_user(user_id: int):
        return User.objects.get(id=user_id)
    
    @staticmethod
    @database_sync_to_async
    def _get_user_by_username(username: str):
        return User.objects.get(username=username)

    @staticmethod
    @database_sync_to_async
    def _create_guest_user(username: str):
        user, created = User.objects.get_or_create(username=username)
        if created:
            user.set_unusable_password()
            user.save()
        return user
