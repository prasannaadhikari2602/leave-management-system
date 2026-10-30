import logging

from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.constants import Role
from apps.common.exceptions import ConflictError

from .emails import send_reset_password_email, send_set_password_email
from .models import User
from .repositories import UserRepository

logger = logging.getLogger(__name__)


class UserService:
    # ------------------------------------------------------------------
    # Validation of the organisation structure
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_assignment(role, department, reporting_manager, user=None):
        """Department and reporting-manager rules for managers and employees."""
        if role != Role.ADMIN:
            if department is None:
                raise ValidationError({"department": "Department is required."})
            if not department.is_active:
                raise ValidationError({"department": "This department is inactive."})

        if reporting_manager is not None:
            if user is not None and reporting_manager.pk == user.pk:
                raise ValidationError({"reporting_manager": "A user cannot report to themselves."})
            if not reporting_manager.is_active:
                raise ValidationError({"reporting_manager": "The reporting manager is inactive."})

        if role == Role.EMPLOYEE:
            if reporting_manager is None:
                raise ValidationError({"reporting_manager": "Employees need a reporting manager."})
            if reporting_manager.role not in (Role.MANAGER, Role.ADMIN):
                raise ValidationError(
                    {"reporting_manager": "Reporting manager must be a manager or admin."}
                )
        elif role == Role.MANAGER and reporting_manager is not None:
            if reporting_manager.role != Role.ADMIN:
                raise ValidationError(
                    {"reporting_manager": "A manager can only report to an admin."}
                )

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    @staticmethod
    def list_users(**filters):
        return UserRepository.list(**filters)

    @staticmethod
    def get_user(user_id):
        user = UserRepository.get_by_id(user_id)
        if user is None:
            raise NotFound("User not found.")
        return user

    @staticmethod
    def get_team(manager):
        return UserRepository.team_of(manager)

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------

    @staticmethod
    def create_user(data):
        """Create a manager/employee, their leave balances, and send the invite."""
        from apps.leaves.services import LeaveBalanceService

        UserService._validate_assignment(
            data["role"], data.get("department"), data.get("reporting_manager")
        )
        if UserRepository.get_by_email(data["email"]):
            raise ValidationError({"email": "A user with this email already exists."})

        with transaction.atomic():
            user = UserRepository.create(data)
            LeaveBalanceService.create_balances_for_user(user)

        invite_sent = UserService._send_invite(user)
        return user, invite_sent

    @staticmethod
    def _send_invite(user):
        try:
            send_set_password_email(user)
            return True
        except Exception:  # SMTP problems must not lose the new account
            logger.exception("Could not send invitation email to %s", user.email)
            return False

    @staticmethod
    def resend_invite(user_id):
        user = UserService.get_user(user_id)
        if user.is_password_set:
            raise ValidationError({"detail": "This user has already set a password."})
        if not UserService._send_invite(user):
            raise ValidationError({"detail": "The email could not be sent. Check email settings."})
        return user

    @staticmethod
    @transaction.atomic
    def update_user(user_id, data, acting_user):
        from apps.leaves.services import LeaveRequestService

        user = UserService.get_user(user_id)
        role = data.get("role", user.role)
        department = data.get("department", user.department)
        reporting_manager = data.get("reporting_manager", user.reporting_manager)
        is_active = data.get("is_active", user.is_active)

        if user.role == Role.ADMIN and role != Role.ADMIN:
            raise ValidationError({"role": "An admin's role cannot be changed here."})
        if user.role != Role.ADMIN and role == Role.ADMIN:
            raise ValidationError({"role": "Admin accounts cannot be created or promoted here."})

        if "is_active" in data and not is_active:
            if user.pk == acting_user.pk:
                raise ValidationError({"is_active": "You cannot deactivate your own account."})
            if not user.is_password_set:
                raise ValidationError({"is_active": "This user has not accepted the invitation yet."})
        if "is_active" in data and is_active and not user.is_password_set:
            raise ValidationError({"is_active": "The user must set a password before activation."})

        if user.role == Role.MANAGER and (role != Role.MANAGER or not is_active):
            if UserRepository.has_active_subordinates(user):
                raise ConflictError(
                    "This manager still has team members. Reassign them to another manager first."
                )

        UserService._validate_assignment(role, department, reporting_manager, user=user)

        manager_changed = reporting_manager != user.reporting_manager
        UserRepository.update(user, data)
        if manager_changed:
            LeaveRequestService.reroute_pending_requests(user)
        return UserService.get_user(user_id)

    @staticmethod
    def delete_user(user_id, acting_user):
        user = UserService.get_user(user_id)
        if user.pk == acting_user.pk:
            raise ValidationError({"detail": "You cannot delete your own account."})
        if user.role == Role.ADMIN:
            raise ValidationError({"detail": "Admin accounts cannot be deleted."})
        if UserRepository.has_subordinates(user):
            raise ConflictError("Reassign this user's team members before deleting them.")
        if UserRepository.has_leave_history(user):
            raise ConflictError(
                "This user has leave history. Deactivate the account instead of deleting it."
            )
        UserRepository.delete(user)


class AuthService:
    @staticmethod
    def authenticate(email, password):
        user = UserRepository.get_by_email(email)
        if user is None or not user.check_password(password):
            raise ValidationError({"detail": "Invalid email or password."})
        if not user.is_password_set:
            raise ValidationError(
                {"detail": "Please set your password using the link sent to your email."}
            )
        if not user.is_active:
            raise ValidationError({"detail": "This account is inactive. Contact HR."})
        return user

    @staticmethod
    def issue_tokens(user):
        refresh = RefreshToken.for_user(user)
        UserRepository.touch_last_login(user)
        return str(refresh.access_token), str(refresh)

    @staticmethod
    def _user_from_uid(uid):
        try:
            return User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            return None

    @staticmethod
    def set_password(uid, token, password):
        """Used for both first-time activation and password reset."""
        user = AuthService._user_from_uid(uid)
        if user is None or not default_token_generator.check_token(user, token):
            raise ValidationError({"token": "This link is invalid or has expired."})
        # A deactivated account must not be revived through a reset link.
        if user.is_password_set and not user.is_active:
            raise ValidationError({"detail": "This account is inactive. Contact HR."})
        return UserRepository.set_password(user, password, activate=True)

    @staticmethod
    def forgot_password(email):
        """Always silent so the endpoint cannot be used to discover accounts."""
        user = UserRepository.get_by_email(email)
        if user is None or not user.is_active or not user.is_password_set:
            return
        try:
            send_reset_password_email(user)
        except Exception:
            logger.exception("Could not send reset email to %s", email)

    @staticmethod
    def change_password(user, current_password, new_password):
        if not user.check_password(current_password):
            raise ValidationError({"current_password": "Current password is incorrect."})
        if current_password == new_password:
            raise ValidationError({"new_password": "Choose a different password."})
        UserRepository.set_password(user, new_password, activate=False)
