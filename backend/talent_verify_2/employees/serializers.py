# backend/employees/serializers.py
from rest_framework import serializers
from .models import Employee, EmployeePosition, EmployeeDocument
from companies.serializers import DepartmentSerializer

class EmployeePositionSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.IntegerField(write_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = EmployeePosition
        fields = [
            'id', 'department', 'department_id', 'role', 'duties',
            'start_date', 'end_date', 'is_current', 'salary',
            'employment_type', 'manager', 'duration', 'created_at'
        ]
    
    def get_duration(self, obj):
        if obj.end_date:
            duration = obj.end_date - obj.start_date
            return duration.days
        else:
            from datetime import date
            duration = date.today() - obj.start_date
            return duration.days
        
class EmployeeDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    
    class Meta:
        model = EmployeeDocument
        fields = [
            'id', 'document_type', 'title', 'uploaded_date',
            'uploaded_by_name', 'is_verified', 'verified_by_name', 'verified_date'
        ]

class EmployeeSerializer(serializers.ModelSerializer):
    positions = EmployeePositionSerializer(many=True, read_only=True)
    documents = EmployeeDocumentSerializer(many=True, read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    current_position = EmployeePositionSerializer(read_only=True)
    
    # Use properties to handle encryption/decryption
    name = serializers.CharField()
    employee_id = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'employee_id', 'email', 'phone',
            'company', 'company_name', 'is_active', 'date_joined',
            'positions', 'documents', 'current_position',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'date_joined']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        
        # Extract and encrypt PII fields
        name = validated_data.pop('name', '')
        employee_id = validated_data.pop('employee_id', '')
        email = validated_data.pop('email', '')
        phone = validated_data.pop('phone', '')
        
        employee = Employee.objects.create(**validated_data)
        
        # Set encrypted properties
        employee.name = name
        employee.employee_id = employee_id
        employee.email = email
        employee.phone = phone
        employee.save()
        
        return employee

    def update(self, instance, validated_data):
        # Handle encrypted fields
        if 'name' in validated_data:
            instance.name = validated_data.pop('name')
        if 'employee_id' in validated_data:
            instance.employee_id = validated_data.pop('employee_id')
        if 'email' in validated_data:
            instance.email = validated_data.pop('email')
        if 'phone' in validated_data:
            instance.phone = validated_data.pop('phone')
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
    
class EmployeeHistorySerializer(serializers.ModelSerializer):
    """Serializer for employee position history"""
    positions = EmployeePositionSerializer(many=True, read_only=True)
    total_positions = serializers.SerializerMethodField()
    total_experience_days = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'employee_id', 'company_name',
            'positions', 'total_positions', 'total_experience_days'
        ]
    
    def get_total_positions(self, obj):
        return obj.positions.count()
    
    def get_total_experience_days(self, obj):
        total_days = 0
        for position in obj.positions.all():
            if position.end_date:
                duration = position.end_date - position.start_date
            else:
                from datetime import date
                duration = date.today() - position.start_date
            total_days += duration.days
        return total_days