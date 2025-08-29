from rest_framework import status, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from audit.models import SecurityEvent, AuditLog
from .models import UserProfile, UserRole
from .serializers import UserProfileSerializer
import logging
from .serializers import (
    UserRegistrationSerializer, UserListSerializer, UserInvitationSerializer,
    PasswordResetSerializer
)
from .models import UserInvitation
from users.models import User
from .permissions import CompanyDataPermission
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)

class SecureTokenObtainPairView(TokenObtainPairView):
    """Enhanced login view with security logging"""
    
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Check for recent failed attempts
        recent_failures = SecurityEvent.objects.filter(
            event_type='failed_login',
            ip_address=ip_address,
            timestamp__gte=timezone.now() - timedelta(minutes=15)
        ).count()
        
        if recent_failures >= 5:
            SecurityEvent.objects.create(
                event_type='account_locked',
                severity='high',
                ip_address=ip_address,
                user_agent=user_agent,
                description=f"Account temporarily locked due to multiple failed login attempts from IP {ip_address}",
                details={'username': username, 'failed_attempts': recent_failures}
            )
            
            return Response(
                {'error': 'Too many failed login attempts. Please try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Attempt authentication
        user = authenticate(username=username, password=password)
        
        if user is None:
            # Log failed login attempt
            SecurityEvent.objects.create(
                event_type='failed_login',
                severity='medium',
                ip_address=ip_address,
                user_agent=user_agent,
                description=f"Failed login attempt for username: {username}",
                details={'username': username, 'ip_address': ip_address}
            )
            
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user account is active
        if not user.is_active:
            SecurityEvent.objects.create(
                event_type='suspicious_activity',
                severity='high',
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                description=f"Login attempt on inactive account: {username}",
                details={'username': username}
            )
            
            return Response(
                {'error': 'Account is deactivated'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Successful login - call parent method
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Log successful login
            AuditLog.objects.create(
                action='login',
                description=f"User {user.username} logged in successfully",
                user=user,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={'login_time': timezone.now().isoformat()}
            )
            
            # Update user profile with last login info
            try:
                # profile = user.profile
                user.last_login_ip = ip_address
                user.last_login = timezone.now()
                user.save()
            except User.DoesNotExist:
                pass
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """Enhanced logout view with audit logging"""
    
    # Log logout
    AuditLog.objects.create(
        action='logout',
        description=f"User {request.user.username} logged out",
        user=request.user,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        metadata={'logout_time': timezone.now().isoformat()}
    )
    
    return Response({'message': 'Logged out successfully'})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_profile_view(request):
    """Get current user profile"""
    try:
        profile = request.user.profile
        serializer = UserProfileSerializer(profile)
        # print(serializer.data)
        return Response(serializer.data)
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_permissions_view(request):
    """Get current user permissions"""
    try:
        profile = request.user.profile
        return Response({
            'role': profile.role.name if profile.role else None,
            'permissions': profile.permissions,
            'company': profile.company.name if profile.company else None,
        })
    except UserProfile.DoesNotExist:
        return Response({'permissions': {}})
    
class UserManagementViewSet(viewsets.ModelViewSet):
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_system_admin:
            return User.objects.all().select_related('created_by')
        elif user.is_company_admin:
            # Company admins see users in their company
            return User.objects.filter(profile__company=user.profile.company).select_related('created_by')
        else:
            # Regular users can only see themselves
            return User.objects.filter(id=user.id)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserListSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Only system admins and company admins can manage users
            self.permission_classes = [CompanyDataPermission]
        return super().get_permissions()

    @action(detail=False, methods=['post'], permission_classes=[CompanyDataPermission])
    def invite_user(self, request):
        """Send invitation email to new user"""
        serializer = UserInvitationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            invitation = serializer.save()
            
            # Send invitation email
            invitation_url = f"{settings.FRONTEND_URL}/accept-invitation/{invitation.invitation_token}"
            
            send_mail(
                subject='Invitation to Talent Verify System',
                message=f'''
                You have been invited to join Talent Verify system.
                
                Company: {invitation.company.name if invitation.company else 'System Administration'}
                Role: {'Company Administrator' if invitation.is_company_admin else 'Company User'}
                
                Click the link below to accept the invitation and set up your account:
                {invitation_url}
                
                This invitation expires on {invitation.expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}.
                
                If you did not expect this invitation, please ignore this email.
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.email],
                fail_silently=False,
            )
            
            return Response({
                'message': 'Invitation sent successfully',
                'invitation_id': invitation.id
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def pending_invitations(self, request):
        """Get pending invitations (for admins)"""
        user = request.user
        if user.is_system_admin:
            invitations = UserInvitation.objects.filter(is_used=False)
        elif user.is_company_admin:
            invitations = UserInvitation.objects.filter(
                company=user.profile.company, 
                is_used=False
            )
        else:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserInvitationSerializer(invitations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def accept_invitation(self, request):
        """Accept user invitation and create account"""
        token = request.data.get('token')
        password = request.data.get('password')
        
        if not token or not password:
            return Response(
                {'error': 'Token and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invitation = UserInvitation.objects.get(
                invitation_token=token,
                is_used=False,
                expires_at__gt=timezone.now()
            )
        except UserInvitation.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired invitation'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create user account
        user_data = {
            'email': invitation.email,
            'username': invitation.email,  # Use email as username
            'first_name': request.data.get('first_name', ''),
            'last_name': request.data.get('last_name', ''),
            'is_company_admin': invitation.is_company_admin,
            'created_by': invitation.invited_by,
            'password_changed_at': timezone.now(),
        }
        
        user = User.objects.create_user(
            password=password,
            **user_data
        )

        profile = user.profile
        profile.company = invitation.company
        profile.phone = request.data.get('phone', '')

        if invitation.is_company_admin:
            role = UserRole.objects.filter(name='company_admin').first()
            profile.role = role

        profile.save()
        
        # Mark invitation as used
        invitation.is_used = True
        invitation.used_at = timezone.now()
        invitation.save()
        
        return Response({
            'message': 'Account created successfully',
            'user_id': user.id
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[CompanyDataPermission])
    def deactivate_user(self, request, pk=None):
        """Deactivate a user account"""
        user = self.get_object()
        
        # Prevent self-deactivation
        if user.id == request.user.id:
            return Response(
                {'error': 'Cannot deactivate your own account'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = False
        user.save()
        
        return Response({'message': 'User deactivated successfully'})

    @action(detail=True, methods=['post'], permission_classes=[CompanyDataPermission])
    def activate_user(self, request, pk=None):
        """Activate a user account"""
        user = self.get_object()
        user.is_active = True
        user.save()
        
        return Response({'message': 'User activated successfully'})