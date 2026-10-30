from django.contrib.auth.models import BaseUserManager

from apps.common.constants import Role


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email address is required.")

        user = self.model(email=self.normalize_email(email).lower(), **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Used by `createsuperuser`: creates the first HR Manager / Admin."""
        extra_fields.setdefault("role", Role.ADMIN)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_password_set", True)
        return self.create_user(email, password, **extra_fields)
