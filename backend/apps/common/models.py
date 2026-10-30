from django.db import models


class CompanySetting(models.Model):
    """Single-row table holding company-wide settings."""

    company_name = models.CharField(max_length=150, default="My Company")
    support_email = models.EmailField(blank=True, default="")
    email_notifications_enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "company_settings"

    def __str__(self):
        return self.company_name
