from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "role", "department", "is_active")
    list_filter = ("role", "is_active", "department")
    search_fields = ("email", "full_name")
    exclude = ("password",)
