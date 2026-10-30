from rest_framework import serializers

from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "name", "description", "is_active", "user_count", "created_at", "updated_at"]
        read_only_fields = ["id", "user_count", "created_at", "updated_at"]

    def get_user_count(self, obj):
        annotated = getattr(obj, "user_count", None)
        return annotated if annotated is not None else obj.users.count()

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Department name cannot be empty.")
        duplicates = Department.objects.filter(name__iexact=value)
        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("A department with this name already exists.")
        return value
