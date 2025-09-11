from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser, User
from channels.db import database_sync_to_async


class JWTAuthMiddleware:
    """Guest-only middleware: accepts ?guest=<username> and creates user if missing.

    Previous JWT logic removed to simplify the game to device / nickname based play.
    If no guest param is provided, scope['user'] becomes AnonymousUser and the
    websocket consumer will reject actions that require a player membership.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        try:
            query_string = scope.get("query_string", b"").decode()
            params = parse_qs(query_string)
            guests = params.get("guest", [])
            if guests:
                username = guests[0][:30]
                if not username:
                    scope["user"] = AnonymousUser()
                else:
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
