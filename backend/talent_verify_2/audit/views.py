from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog, SecurityEvent
from .serializers import AuditLogSerializer, SecurityEventSerializer
from authentication.permissions import RoleBasedPermission

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for audit logs - read-only"""
    serializer_class = AuditLogSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['action', 'user', 'content_type']
    search_fields = ['description', 'user__username']
    ordering = ['-timestamp']

    def get_queryset(self):
        # Only talent verify admins can see all audit logs
        user_profile = self.request.user.profile
        
        if user_profile.role and user_profile.role.name == 'talent_verify_admin':
            return AuditLog.objects.all()
        elif user_profile.company:
            # Company users can only see logs related to their company's data
            return AuditLog.objects.filter(
                Q(metadata__company_id=user_profile.company.id) |
                Q(user__profile__company=user_profile.company)
            )
        else:
            # Regular users can only see their own actions
            return AuditLog.objects.filter(user=self.request.user)
        
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get audit analytics"""
        queryset = self.get_queryset()
        
        # Time-based filtering
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=start_date)
        
        analytics = {
            'total_actions': queryset.count(),
            'actions_by_type': {},
            'actions_by_user': {},
            'actions_by_day': {},
            'most_active_users': [],
        }
        
        # Actions by type
        action_counts = queryset.values('action').annotate(count=Count('id'))
        for item in action_counts:
            analytics['actions_by_type'][item['action']] = item['count']
        
        # Actions by user
        user_counts = queryset.values(
            'user__username', 'user__first_name', 'user__last_name'
        ).annotate(count=Count('id')).order_by('-count')[:10]
        
        for item in user_counts:
            username = item['user__username'] or 'Unknown'
            full_name = f"{item['user__first_name']} {item['user__last_name']}".strip()
            display_name = full_name if full_name else username
            
            analytics['most_active_users'].append({
                'username': username,
                'display_name': display_name,
                'action_count': item['count']
            })
        
        return Response(analytics)
    
    @action(detail=False, methods=['get'])
    def recent_activity(self, request):
        """Get recent activity feed"""
        queryset = self.get_queryset()[:50]  # Last 50 activities
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class SecurityEventViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for security events - read-only"""
    serializer_class = SecurityEventSerializer
    permission_classes = [RoleBasedPermission]
    filterset_fields = ['event_type', 'severity', 'is_resolved']
    search_fields = ['description', 'user__username']
    ordering = ['-timestamp']

    def get_queryset(self):
        # Only admins can see security events
        user_profile = self.request.user.profile
        
        if user_profile.role and user_profile.role.name in ['talent_verify_admin', 'company_admin']:
            return SecurityEvent.objects.all()
        else:
            return SecurityEvent.objects.none()
        
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark a security event as resolved"""
        event = self.get_object()
        
        if event.is_resolved:
            return Response({'error': 'Event is already resolved'}, status=400)
        
        event.is_resolved = True
        event.resolved_by = request.user
        event.resolved_at = timezone.now()
        event.resolution_notes = request.data.get('notes', '')
        event.save()
        
        return Response({'message': 'Event marked as resolved'})
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get security dashboard data"""
        queryset = self.get_queryset()
        
        # Recent events (last 7 days)
        recent_date = timezone.now() - timedelta(days=7)
        recent_events = queryset.filter(timestamp__gte=recent_date)
        
        dashboard_data = {
            'total_events': queryset.count(),
            'unresolved_events': queryset.filter(is_resolved=False).count(),
            'recent_events': recent_events.count(),
            'events_by_severity': {},
            'events_by_type': {},
            'critical_events': [],
        }
        
        # Events by severity
        severity_counts = queryset.values('severity').annotate(count=Count('id'))
        for item in severity_counts:
            dashboard_data['events_by_severity'][item['severity']] = item['count']
        
        # Events by type
        type_counts = recent_events.values('event_type').annotate(count=Count('id'))
        for item in type_counts:
            dashboard_data['events_by_type'][item['event_type']] = item['count']
        
        # Critical unresolved events
        critical_events = queryset.filter(
            severity='critical',
            is_resolved=False
        ).order_by('-timestamp')[:5]
        
        dashboard_data['critical_events'] = SecurityEventSerializer(
            critical_events, many=True
        ).data
        
        return Response(dashboard_data)