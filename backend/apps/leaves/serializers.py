from rest_framework import serializers

from .models import (
    LeaveBalance,
    LeavePolicy,
    LeaveRequest,
    LeaveRequestHistory,
    LeaveType,
)


class LeaveTypeSerializer(serializers.ModelSerializer):
    policy_id = serializers.IntegerField(source="policy.id", read_only=True, default=None)
    annual_entitlement = serializers.DecimalField(
        source="policy.annual_entitlement", max_digits=5, decimal_places=2, read_only=True, default=None
    )

    class Meta:
        model = LeaveType
        fields = [
            "id", "name", "description", "is_active",
            "policy_id", "annual_entitlement", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "policy_id", "annual_entitlement", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Leave type name cannot be empty.")
        duplicates = LeaveType.objects.filter(name__iexact=value)
        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("A leave type with this name already exists.")
        return value


class LeavePolicySerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)

    class Meta:
        model = LeavePolicy
        fields = [
            "id", "leave_type", "leave_type_name", "annual_entitlement", "max_consecutive_days",
            "half_day_allowed", "approval_required", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "leave_type_name", "created_at", "updated_at"]

    def validate_leave_type(self, value):
        if self.instance is not None and value != self.instance.leave_type:
            raise serializers.ValidationError("The leave type of a policy cannot be changed.")
        return value

    def validate_annual_entitlement(self, value):
        if value < 0 or value > 366:
            raise serializers.ValidationError("Entitlement must be between 0 and 366 days.")
        return value

    def validate_max_consecutive_days(self, value):
        if value < 1:
            raise serializers.ValidationError("Must be at least 1 day.")
        return value


class LeaveBalanceSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    remaining_days = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    pending_days = serializers.SerializerMethodField()

    class Meta:
        model = LeaveBalance
        fields = [
            "id", "user", "user_name", "leave_type", "leave_type_name", "year",
            "entitled_days", "used_days", "remaining_days", "pending_days", "updated_at",
        ]
        read_only_fields = fields

    def get_pending_days(self, obj):
        return getattr(obj, "pending_days", 0)


class UpdateEntitlementSerializer(serializers.Serializer):
    entitled_days = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0)


class AllocateYearSerializer(serializers.Serializer):
    year = serializers.IntegerField(min_value=2000, max_value=2100)


class LeaveHistorySerializer(serializers.ModelSerializer):
    action_by_name = serializers.CharField(source="action_by.full_name", read_only=True, default="System")

    class Meta:
        model = LeaveRequestHistory
        fields = ["id", "action", "action_by", "action_by_name", "old_status", "new_status", "comment", "created_at"]
        read_only_fields = fields


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_email = serializers.CharField(source="employee.email", read_only=True)
    department_name = serializers.CharField(source="employee.department.name", read_only=True, default=None)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    approver_name = serializers.CharField(source="approver.full_name", read_only=True, default=None)

    class Meta:
        model = LeaveRequest
        fields = [
            "id", "employee", "employee_name", "employee_email", "department_name",
            "leave_type", "leave_type_name", "approver", "approver_name",
            "start_date", "end_date", "is_half_day", "total_days", "reason", "status",
            "decision_comment", "decided_at", "created_at", "updated_at",
        ]
        read_only_fields = fields


class LeaveRequestDetailSerializer(LeaveRequestSerializer):
    history = LeaveHistorySerializer(many=True, read_only=True)

    class Meta(LeaveRequestSerializer.Meta):
        fields = LeaveRequestSerializer.Meta.fields + ["history"]
        read_only_fields = fields


class ApplyLeaveSerializer(serializers.Serializer):
    leave_type = serializers.PrimaryKeyRelatedField(queryset=LeaveType.objects.filter(is_active=True))
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    is_half_day = serializers.BooleanField(required=False, default=False)
    reason = serializers.CharField(min_length=3, max_length=1000)

    def validate(self, attrs):
        if attrs["end_date"] < attrs["start_date"]:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})
        return attrs


class ReviewSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class CalendarEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    department_name = serializers.CharField(source="employee.department.name", read_only=True, default=None)

    class Meta:
        model = LeaveRequest
        fields = [
            "id", "employee", "employee_name", "department_name", "leave_type_name",
            "start_date", "end_date", "is_half_day", "total_days", "status",
        ]
        read_only_fields = fields


class CalendarQuerySerializer(serializers.Serializer):
    start = serializers.DateField()
    end = serializers.DateField()
    department = serializers.IntegerField(required=False)
