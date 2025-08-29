from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from audit.models import SecurityEvent
import time

class RateLimitMiddleware(MiddlewareMixin):
    """Rate limiting middleware"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Rate limits: requests per minute
        self.rate_limits = {
            'api': 100,  # 100 requests per minute for API endpoints
            'auth': 10,  # 10 login attempts per minute
            'bulk': 5,   # 5 bulk operations per minute
        }

    def process_request(self, request):
        if not self.should_rate_limit(request):
            return None
        
        client_ip = self.get_client_ip(request)
        limit_type = self.get_limit_type(request)
        
        # Create cache key
        cache_key = f"rate_limit:{limit_type}:{client_ip}"
        
        # Get current count
        current_count = cache.get(cache_key, 0)
        limit = self.rate_limits.get(limit_type, 60)
        
        if current_count >= limit:
            # Log rate limit violation
            SecurityEvent.objects.create(
                event_type='suspicious_activity',
                severity='medium',
                ip_address=client_ip,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                description=f"Rate limit exceeded for {limit_type} from IP {client_ip}",
                details={
                    'limit_type': limit_type,
                    'current_count': current_count,
                    'limit': limit,
                    'path': request.path
                }
            )
            
            return JsonResponse(
                {'error': 'Rate limit exceeded. Please slow down.'},
                status=429
            )
        
        # Increment counter
        cache.set(cache_key, current_count + 1, 60)  # 1 minute expiry
        
        return None
    
    def should_rate_limit(self, request):
        """Determine if request should be rate limited"""
        return (
            request.path.startswith('/api/') or
            request.path.startswith('/auth/')
        )
    
    def get_limit_type(self, request):
        """Determine the type of rate limit to apply"""
        if '/auth/' in request.path:
            return 'auth'
        elif '/bulk' in request.path:
            return 'bulk'
        else:
            return 'api'
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add security headers to responses"""
    
    def process_response(self, request, response):
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Content-Security-Policy'] = "default-src 'self'"
        
        # Remove server information
        if 'Server' in response:
            del response['Server']
        
        return response