from rest_framework import serializers
from .models import BulkUploadJob

class BulkUploadJobSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = BulkUploadJob
        fields = [
            'id', 'operation_type', 'status', 'file_name',
            'total_records', 'processed_records', 'success_records', 'error_records',
            'progress_percentage', 'error_details', 'created_by_name', 'company_name',
            'created_at', 'started_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'status', 'total_records', 'processed_records', 'success_records',
            'error_records', 'progress_percentage', 'error_details', 'created_at',
            'started_at', 'completed_at'
        ]

from companies.models import Company
class BulkUploadCreateSerializer(serializers.Serializer):
    operation_type = serializers.ChoiceField(choices=BulkUploadJob.OPERATION_CHOICES)
    file = serializers.FileField()
    company = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.none(),  # temporary default
        required=False,
        allow_null=True
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Set company queryset based on user permissions
        if self.context.get('request'):
            user = self.context['request'].user
            
            if user.is_superuser or user.profile.role.name == 'talent_verify_admin':
                self.fields['company'].queryset = Company.objects.all()
            elif user.profile.company:
                self.fields['company'].queryset = Company.objects.filter(id=user.profile.company.id)
            else:
                self.fields['company'].queryset = Company.objects.none()