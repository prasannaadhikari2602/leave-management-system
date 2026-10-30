from django.contrib.auth.password_validation import validate_password
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from apps.common.constants import Role
from apps.departments.models import Department

from .models import User


class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    reporting_manager_name = serializers.CharField(
        source="reporting_manager.full_name", read_only=True, default=None
    )

    class Meta:
        model = User
        fields = [
            "id", "full_name", "email", "role", "is_active", "is_password_set",
            "department", "department_name", "reporting_manager", "reporting_manager_name",
            "date_joined",
        ]
        read_only_fields = fields


class CreateUserSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    reporting_manager = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = ["full_name", "email", "role", "department", "reporting_manager"]

    def validate_role(self, value):
        if value not in (Role.MANAGER, Role.EMPLOYEE):
            raise serializers.ValidationError("Only manager and employee accounts can be created.")
        return value

    def validate_email(self, value):
        return value.strip().lower()

    def validate_full_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Enter the user's full name.")
        return value


class UpdateUserSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)
    reporting_manager = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = ["full_name", "role", "department", "reporting_manager", "is_active"]

    def validate_full_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Enter the user's full name.")
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class SetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        user = None
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(attrs["uid"])))
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            pass
        validate_password(attrs["password"], user)
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs["new_password"], self.context["request"].user)
        return attrs
