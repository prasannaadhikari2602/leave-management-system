from django.db.models import Q
from django.utils import timezone

from apps.common.constants import Role

from .models import User

ALLOWED_ORDERING = {
    "full_name", "-full_name", "email", "-email", "date_joined", "-date_joined", "role", "-role",
}


class UserRepository:
    @staticmethod
    def _base_queryset():
        return User.objects.select_related("department", "reporting_manager")

    @staticmethod
    def create(data):
        data = dict(data)
        return User.objects.create_user(
            email=data.pop("email"),
            is_active=False,
            is_password_set=False,
            **data,
        )

    @staticmethod
    def get_by_id(user_id):
        return UserRepository._base_queryset().filter(pk=user_id).first()

    @staticmethod
    def get_by_email(email):
        return User.objects.filter(email__iexact=email).first()

    @staticmethod
    def list(search=None, roles=None, department_id=None, is_active=None,
             reporting_manager_id=None, ordering="full_name"):
        queryset = UserRepository._base_queryset()
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) | Q(email__icontains=search)
            )
        if roles:
            queryset = queryset.filter(role__in=roles)
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        if reporting_manager_id:
            queryset = queryset.filter(reporting_manager_id=reporting_manager_id)
        if ordering not in ALLOWED_ORDERING:
            ordering = "full_name"
        return queryset.order_by(ordering)

    @staticmethod
    def team_of(manager):
        return UserRepository._base_queryset().filter(reporting_manager=manager).order_by("full_name")

    @staticmethod
    def active_admins(exclude_id=None):
        queryset = User.objects.filter(role=Role.ADMIN, is_active=True)
        if exclude_id:
            queryset = queryset.exclude(pk=exclude_id)
        return queryset.order_by("id")

    @staticmethod
    def has_active_subordinates(user):
        return user.subordinates.filter(is_active=True).exists()

    @staticmethod
    def has_subordinates(user):
        return user.subordinates.exists()

    @staticmethod
    def has_leave_history(user):
        return user.leave_requests.exists()

    @staticmethod
    def update(user, data):
        for field, value in data.items():
            setattr(user, field, value)
        user.save()
        return user

    @staticmethod
    def set_password(user, password, activate=True):
        user.set_password(password)
        fields = ["password", "updated_at"]
        if activate:
            user.is_active = True
            user.is_password_set = True
            fields += ["is_active", "is_password_set"]
        user.save(update_fields=fields)
        return user

    @staticmethod
    def touch_last_login(user):
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

    @staticmethod
    def delete(user):
        user.delete()
