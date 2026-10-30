from rest_framework import serializers

from .models import CompanySetting


class CompanySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySetting
        fields = ["company_name", "support_email", "email_notifications_enabled", "updated_at"]
        read_only_fields = ["updated_at"]
