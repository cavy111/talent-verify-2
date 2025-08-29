from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
import threading

# Thread-local storage for request data
_thread_locals = threading.local()

class AuditMiddleware(MiddlewareMixin):
    """Middleware to capture request context for audit logging"""
    
    def process_request(self, request):
        _thread_locals.user = getattr(request, 'user', None)
        _thread_locals.ip_address = self.get_client_ip(request)
        _thread_locals.user_agent = request.META.get('HTTP_USER_AGENT', '')
        _thread_locals.session_key = request.session.session_key

    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get_current_user():
        """Get current user from thread local"""
        return getattr(_thread_locals, 'user', None)
    
    def get_current_ip():
        """Get current IP from thread local"""
        return getattr(_thread_locals, 'ip_address', None)

    def get_current_user_agent():
        """Get current user agent from thread local"""
        return getattr(_thread_locals, 'user_agent', None)

    def get_current_session_key():
        """Get current session key from thread local"""
        return getattr(_thread_locals, 'session_key', None)