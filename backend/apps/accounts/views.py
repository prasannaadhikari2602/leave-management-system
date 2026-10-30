from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.permissions import IsAdminOrManager, IsAdminRole
from apps.common.responses import paginated_response, parse_bool, success_response

from .cookies import clear_auth_cookies, set_access_cookie, set_refresh_cookie
from .serializers import (
    ChangePasswordSerializer,
    CreateUserSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    SetPasswordSerializer,
    UpdateUserSerializer,
    UserSerializer,
)
from .services import AuthService, UserService


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = AuthService.authenticate(**serializer.validated_data)
        access, refresh = AuthService.issue_tokens(user)

        response = success_response({"user": UserSerializer(user).data}, "Login successful.")
        set_access_cookie(response, access)
        set_refresh_cookie(response, refresh)
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if not refresh:
            return Response(
                {"success": False, "status_code": 401, "message": "No refresh token.",
                 "errors": {"detail": "No refresh token."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        serializer = TokenRefreshSerializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0])

        response = success_response(message="Token refreshed.")
        set_access_cookie(response, serializer.validated_data["access"])
        if "refresh" in serializer.validated_data:  # rotation is on
            set_refresh_cookie(response, serializer.validated_data["refresh"])
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass  # already invalid: still clear the cookies
        response = success_response(message="Logged out.")
        clear_auth_cookies(response)
        return response


class MeView(APIView):
    def get(self, request):
        return success_response(UserSerializer(request.user).data)


class SetPasswordView(APIView):
    """Public: the signed token in the body is the proof of ownership."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        AuthService.set_password(data["uid"], data["token"], data["password"])
        return success_response(message="Password saved. You can now sign in.")


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AuthService.forgot_password(serializer.validated_data["email"])
        return success_response(
            message="If an account exists for that email, a reset link has been sent."
        )


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        AuthService.change_password(request.user, data["current_password"], data["new_password"])
        return success_response(message="Password changed successfully.")


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

class UserListCreateView(APIView):
    """GET: admin/manager (filtered list). POST: admin creates a manager/employee."""

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated(), IsAdminOrManager()]

    def get(self, request):
        params = request.query_params
        roles = [r for r in params.get("role", "").split(",") if r]
        users = UserService.list_users(
            search=params.get("search", "").strip(),
            roles=roles,
            department_id=params.get("department") or None,
            is_active=parse_bool(params.get("is_active")),
            reporting_manager_id=params.get("reporting_manager") or None,
            ordering=params.get("ordering", "full_name"),
        )
        # Managers only ever see their own team through this endpoint.
        if request.user.role != "admin":
            users = users.filter(reporting_manager=request.user)
        return paginated_response(request, users, UserSerializer, "Users retrieved successfully.")

    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, invite_sent = UserService.create_user(serializer.validated_data)
        message = (
            "User created and invitation email sent."
            if invite_sent
            else "User created, but the invitation email could not be sent. Use 'Resend invite'."
        )
        return success_response(
            {"user": UserSerializer(user).data, "invite_sent": invite_sent},
            message,
            status_code=status.HTTP_201_CREATED,
        )


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, user_id):
        return success_response(UserSerializer(UserService.get_user(user_id)).data)

    def patch(self, request, user_id):
        serializer = UpdateUserSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = UserService.update_user(user_id, serializer.validated_data, request.user)
        return success_response(UserSerializer(user).data, "User updated successfully.")

    def delete(self, request, user_id):
        UserService.delete_user(user_id, request.user)
        return success_response(message="User deleted successfully.")


class ResendInviteView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, user_id):
        UserService.resend_invite(user_id)
        return success_response(message="Invitation email sent successfully.")


class MyTeamView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrManager]

    def get(self, request):
        team = UserService.get_team(request.user)
        return paginated_response(request, team, UserSerializer, "Team retrieved successfully.")
