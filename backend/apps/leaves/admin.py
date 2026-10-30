from django.contrib import admin

from .models import LeaveBalance, LeavePolicy, LeaveRequest, LeaveRequestHistory, LeaveType

for model in (LeaveType, LeavePolicy, LeaveBalance, LeaveRequest, LeaveRequestHistory):
    admin.site.register(model)
