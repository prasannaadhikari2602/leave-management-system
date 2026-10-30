from .models import CompanySetting


class CompanySettingRepository:
    @staticmethod
    def get():
        setting, _ = CompanySetting.objects.get_or_create(pk=1)
        return setting

    @staticmethod
    def update(setting, data):
        for field, value in data.items():
            setattr(setting, field, value)
        setting.save()
        return setting
