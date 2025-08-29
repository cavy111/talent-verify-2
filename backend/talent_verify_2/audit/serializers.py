from rest_framework import serializers
from .models import AuditLog, SecurityEvent

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    content_type_name = serializers.CharField(source='content_type.name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'action', 'description', 'user_name', 'username',
            'content_type_name', 'object_id', 'old_values', 'new_values',
            'ip_address', 'user_agent', 'metadata', 'timestamp'
        ]

class SecurityEventSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'event_type', 'severity', 'user_name', 'username',
            'ip_address', 'description', 'details',
            'is_resolved', 'resolved_by_name', 'resolution_notes',
            'timestamp', 'resolved_at'
        ]