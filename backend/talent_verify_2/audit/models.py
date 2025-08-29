from django.db import models
from authentication.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import json

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
        ('EXPORT', 'Export'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('BULK_IMPORT', 'Bulk Import'),
    ]
    
    # What was changed
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Action details
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    table_name = models.CharField(max_length=100)
    record_id = models.CharField(max_length=100, null=True, blank=True)
    
    # Change details
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    changed_fields = models.JSONField(default=list)
    
    # Metadata
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    session_key = models.CharField(max_length=50, null=True, blank=True)
    
    # Additional context
    description = models.TextField(null=True, blank=True)
    extra_data = models.JSONField(default=dict)
    metadata = models.JSONField(null=True, blank=True)

    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['table_name', 'record_id']),
        ]
    
    def __str__(self):
        user_name = self.user.username if self.user else 'System'
        return f"{user_name} {self.action} {self.table_name} at {self.timestamp}"
    
class AuditConfiguration(models.Model):
    """Configuration for what to audit"""
    model_name = models.CharField(max_length=100, unique=True)
    is_enabled = models.BooleanField(default=True)
    track_creates = models.BooleanField(default=True)
    track_updates = models.BooleanField(default=True)
    track_deletes = models.BooleanField(default=True)
    track_views = models.BooleanField(default=False)  # Can be expensive
    excluded_fields = models.JSONField(default=list)  # Fields to exclude from tracking
    
    def __str__(self):
        return f"Audit config for {self.model_name}"
    
class SecurityEvent(models.Model):
    """Model for tracking security events and incidents"""
    
    EVENT_TYPE_CHOICES = [
        ('failed_login', 'Failed Login'),
        ('multiple_failed_logins', 'Multiple Failed Logins'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('unauthorized_access', 'Unauthorized Access'),
        ('data_breach', 'Data Breach'),
        ('privilege_escalation', 'Privilege Escalation'),
        ('malicious_request', 'Malicious Request'),
        ('account_lockout', 'Account Lockout'),
        ('password_reset', 'Password Reset'),
        ('session_hijacking', 'Session Hijacking'),
        ('sql_injection', 'SQL Injection Attempt'),
        ('xss_attempt', 'XSS Attempt'),
        ('unusual_location', 'Login from Unusual Location'),
        ('bulk_download', 'Bulk Data Download'),
        ('admin_action', 'Administrative Action'),
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    # Event details
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    
    # User information
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    # Event description and details
    description = models.TextField()
    details = models.JSONField(default=dict)  # Additional event-specific data
    
    # Resolution tracking
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='resolved_security_events'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['severity', 'is_resolved']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
        ]
    
    def __str__(self):
        user_info = f" for {self.user.username}" if self.user else ""
        return f"{self.get_event_type_display()} ({self.severity}){user_info} at {self.timestamp}"