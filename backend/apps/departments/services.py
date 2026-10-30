from rest_framework.exceptions import NotFound

from apps.common.exceptions import ConflictError

from .repositories import DepartmentRepository


class DepartmentService:
    @staticmethod
    def create_department(data):
        return DepartmentRepository.create(data)

    @staticmethod
    def list_departments(search=None, is_active=None, ordering="name"):
        return DepartmentRepository.list(search, is_active, ordering)

    @staticmethod
    def get_department(department_id):
        department = DepartmentRepository.get_by_id(department_id)
        if department is None:
            raise NotFound("Department not found.")
        return department

    @staticmethod
    def update_department(department_id, data):
        department = DepartmentService.get_department(department_id)
        DepartmentRepository.update(department, data)
        return DepartmentService.get_department(department_id)

    @staticmethod
    def delete_department(department_id):
        department = DepartmentService.get_department(department_id)
        if DepartmentRepository.has_users(department):
            raise ConflictError(
                "This department still has users. Reassign them or deactivate "
                "the department instead of deleting it."
            )
        DepartmentRepository.delete(department)
