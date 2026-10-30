from rest_framework.permissions import BasePermission

from .constants import Role


class _RolePermission(BasePermission):
    """Base class: allow authenticated users whose role is in `roles`."""

    roles: tuple = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.roles)


class IsAdminRole(_RolePermission):
    message = "Only admins can access this resource."
    roles = (Role.ADMIN,)


class IsManagerRole(_RolePermission):
    message = "Only managers can access this resource."
    roles = (Role.MANAGER,)


class IsEmployeeRole(_RolePermission):
    message = "Only employees can access this resource."
    roles = (Role.EMPLOYEE,)


class IsAdminOrManager(_RolePermission):
    message = "Only admins and managers can access this resource."
    roles = (Role.ADMIN, Role.MANAGER)
