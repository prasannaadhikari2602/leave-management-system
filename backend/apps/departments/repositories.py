from django.db.models import Count, Q

from .models import Department

ALLOWED_ORDERING = {
    "name", "-name", "created_at", "-created_at", "user_count", "-user_count",
}


class DepartmentRepository:
    @staticmethod
    def _base_queryset():
        return Department.objects.annotate(user_count=Count("users", distinct=True))

    @staticmethod
    def create(data):
        return Department.objects.create(**data)

    @staticmethod
    def list(search=None, is_active=None, ordering="name"):
        queryset = DepartmentRepository._base_queryset()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        if ordering not in ALLOWED_ORDERING:
            ordering = "name"
        return queryset.order_by(ordering)

    @staticmethod
    def get_by_id(department_id):
        return DepartmentRepository._base_queryset().filter(pk=department_id).first()

    @staticmethod
    def update(department, data):
        for field, value in data.items():
            setattr(department, field, value)
        department.save()
        return department

    @staticmethod
    def has_users(department):
        return department.users.exists()

    @staticmethod
    def delete(department):
        department.delete()
