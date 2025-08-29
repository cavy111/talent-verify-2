from .models import AuditLog, AuditConfiguration
from .middleware import get_current_user, get_current_ip, get_current_user_agent, get_current_session_key
from django.contrib.contenttypes.models import ContentType
from django.db import models
import json

class AuditLogger:
    """Utility class for creating audit logs"""
    
    @staticmethod
    def log_action(action, instance=None, old_values=None, new_values=None, 
                   description=None, extra_data=None, table_name=None, record_id=None):
        """
        Log an action to the audit trail
        
        Args:
            action: Action type (CREATE, UPDATE, DELETE, etc.)
            instance: Model instance that was affected
            old_values: Dict of old field values
            new_values: Dict of new field values
            description: Human-readable description
            extra_data: Additional context data
            table_name: Override table name
            record_id: Override record ID
        """
        
        # Get current request context
        user = get_current_user()
        if isinstance(user, models.AnonymousUser):
            user = None
        
        # Determine content type and object info
        content_type = None
        object_id = None
        if instance:
            content_type = ContentType.objects.get_for_model(instance)
            object_id = instance.pk
            table_name = table_name or instance._meta.db_table
            record_id = record_id or str(instance.pk)
        
        # Calculate changed fields
        changed_fields = []
        if old_values and new_values:
            for field, new_value in new_values.items():
                old_value = old_values.get(field)
                if old_value != new_value:
                    changed_fields.append(field)
        
        # Create audit log entry
        audit_log = AuditLog.objects.create(
            content_type=content_type,
            object_id=object_id,
            action=action,
            table_name=table_name or 'unknown',
            record_id=record_id,
            old_values=old_values,
            new_values=new_values,
            changed_fields=changed_fields,
            user=user,
            ip_address=get_current_ip(),
            user_agent=get_current_user_agent(),
            session_key=get_current_session_key(),
            description=description,
            extra_data=extra_data or {}
        )
        
        return audit_log
    
    @staticmethod
    def log_view(instance, description=None):
        """Log a view action"""
        return AuditLogger.log_action(
            action='VIEW',
            instance=instance,
            description=description or f"Viewed {instance._meta.verbose_name}"
        )
    
    @staticmethod
    def log_create(instance, description=None):
        """Log a create action"""
        # Get all field values for new record
        new_values = {}
        for field in instance._meta.fields:
            if not field.name.startswith('_'):
                value = getattr(instance, field.name, None)
                if value is not None:
                    new_values[field.name] = str(value)
        
        return AuditLogger.log_action(
            action='CREATE',
            instance=instance,
            new_values=new_values,
            description=description or f"Created {instance._meta.verbose_name}"
        )
    
    @staticmethod
    def log_update(instance, old_values, description=None):
        """Log an update action"""
        # Get current field values
        new_values = {}
        for field in instance._meta.fields:
            if not field.name.startswith('_'):
                value = getattr(instance, field.name, None)
                if value is not None:
                    new_values[field.name] = str(value)
        
        return AuditLogger.log_action(
            action='UPDATE',
            instance=instance,
            old_values=old_values,
            new_values=new_values,
            description=description or f"Updated {instance._meta.verbose_name}"
        )
    
    @staticmethod
    def log_delete(instance, description=None):
        """Log a delete action"""
        # Get all field values before deletion
        old_values = {}
        for field in instance._meta.fields:
            if not field.name.startswith('_'):
                value = getattr(instance, field.name, None)
                if value is not None:
                    old_values[field.name] = str(value)
        
        return AuditLogger.log_action(
            action='DELETE',
            instance=instance,
            old_values=old_values,
            description=description or f"Deleted {instance._meta.verbose_name}"
        )
    
    @staticmethod
    def log_bulk_import(model_class, count, description=None):
        """Log a bulk import action"""
        return AuditLogger.log_action(
            action='BULK_IMPORT',
            table_name=model_class._meta.db_table,
            description=description or f"Bulk imported {count} {model_class._meta.verbose_name_plural}",
            extra_data={'record_count': count}
        )
    
    @staticmethod
    def log_export(model_class, count, export_format, description=None):
        """Log an export action"""
        return AuditLogger.log_action(
            action='EXPORT',
            table_name=model_class._meta.db_table,
            description=description or f"Exported {count} {model_class._meta.verbose_name_plural} as {export_format}",
            extra_data={'record_count': count, 'format': export_format}
        )
    
    @staticmethod
    def log_login(user, description=None):
        """Log a login action"""
        return AuditLogger.log_action(
            action='LOGIN',
            table_name='auth_user',
            record_id=str(user.pk) if user else None,
            description=description or f"User {user.username if user else 'Unknown'} logged in",
            extra_data={'username': user.username if user else None}
        )
    
    @staticmethod
    def log_logout(user, description=None):
        """Log a logout action"""
        return AuditLogger.log_action(
            action='LOGOUT',
            table_name='auth_user',
            record_id=str(user.pk) if user else None,
            description=description or f"User {user.username if user else 'Unknown'} logged out",
            extra_data={'username': user.username if user else None}
        )