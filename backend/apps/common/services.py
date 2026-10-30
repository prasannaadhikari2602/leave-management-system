from .repositories import CompanySettingRepository


class CompanySettingService:
    @staticmethod
    def get_settings():
        return CompanySettingRepository.get()

    @staticmethod
    def update_settings(data):
        setting = CompanySettingRepository.get()
        return CompanySettingRepository.update(setting, data)
