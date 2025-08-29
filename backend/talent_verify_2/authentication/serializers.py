from rest_framework import serializers
from .models import UserInvitation
from .models import UserProfile, UserRole
from companies.serializers import CompanySerializer
from django.contrib.auth.password_validation import validate_password
from companies.models import Company
from django.utils import timezone
from datetime import timedelta
import secrets
from users.models import User

class UserRoleSerializer(serializers.ModelSerializer):
    """Serializer for user roles"""
    
    class Meta:
        model = UserRole
        fields = ['id', 'name', 'description', 'permissions', 'created_at']
        read_only_fields = ['created_at']

class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profiles"""
    user = UserSerializer(read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_description = serializers.CharField(source='role.description', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'role', 'role_name', 'role_description',
            'company', 'company_name', 'phone', 'is_active',
            'permissions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'permissions']
    
    def get_permissions(self, obj):
        """Get user permissions from role"""
        return obj.permissions

class UserProfileDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for user profiles with nested objects"""
    user = UserSerializer(read_only=True)
    role = UserRoleSerializer(read_only=True)
    company = CompanySerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'role', 'company', 'phone', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profiles"""
    user_data = serializers.DictField(write_only=True, required=False)
    
    class Meta:
        model = UserProfile
        fields = ['role', 'company', 'phone', 'is_active', 'user_data']
    
    def update(self, instance, validated_data):
        # Handle user data updates
        user_data = validated_data.pop('user_data', {})
        if user_data:
            user_serializer = UserSerializer(instance.user, data=user_data, partial=True)
            if user_serializer.is_valid():
                user_serializer.save()
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    role_id = serializers.IntegerField(write_only=True, required=False)
    company_id = serializers.IntegerField(write_only=True, required=False)
    # phone = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'role_id', 'company_id','is_company_admin'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Validate company assignment permissions
        request_user = self.context['request'].user
        
        if not request_user.is_system_admin:
            # Company admins can only create users for their own company
            if not attrs.get('company_id') or attrs['company_id'] != request_user.company.id:
                raise serializers.ValidationError(
                    "You can only create users for your own company"
                )
            
            # Company admins cannot create other company admins
            if attrs.get('is_company_admin', False):
                raise serializers.ValidationError(
                    "Only system administrators can create company administrators"
                )
        return attrs
    
    def create(self, validated_data):
        # Remove profile-specific fields
        password_confirm = validated_data.pop('password_confirm')
        role_id = validated_data.pop('role_id', None)
        company_id = validated_data.pop('company_id', None)
        phone = validated_data.pop('phone', '')

        validated_data['created_by'] = self.context['request'].user
        validated_data['password_changed_at'] = timezone.now()
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Update user profile
        profile = user.profile
        if role_id:
            try:
                role = UserRole.objects.get(id=role_id)
                if role.name == 'talent_verify_admin':
                    user.is_system_admin = True
                elif role.name == 'company_admin':
                    user.is_company_admin = True
                profile.role = role
            except UserRole.DoesNotExist:
                pass
        
        if company_id:
            try:
                from companies.models import Company
                company = Company.objects.get(id=company_id)
                profile.company = company
            except Company.DoesNotExist:
                pass
        user.save()
        profile.phone = phone
        profile.save()
        
        return user

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing user password"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New passwords don't match")
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value
    
    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user

class UserPermissionCheckSerializer(serializers.Serializer):
    """Serializer for checking user permissions"""
    permission = serializers.CharField()
    
    def validate_permission(self, value):
        # You can add validation for valid permission names here
        return value

class BulkUserCreateSerializer(serializers.Serializer):
    """Serializer for bulk user creation"""
    users = serializers.ListField(
        child=UserRegistrationSerializer(),
        min_length=1,
        max_length=100  # Limit bulk operations
    )
    
    def create(self, validated_data):
        users_data = validated_data['users']
        created_users = []
        errors = []
        
        for i, user_data in enumerate(users_data):
            try:
                serializer = UserRegistrationSerializer(data=user_data)
                if serializer.is_valid():
                    user = serializer.save()
                    created_users.append(user)
                else:
                    errors.append({
                        'index': i,
                        'username': user_data.get('username', ''),
                        'errors': serializer.errors
                    })
            except Exception as e:
                errors.append({
                    'index': i,
                    'username': user_data.get('username', ''),
                    'errors': {'general': [str(e)]}
                })
        
        return {
            'created_users': created_users,
            'errors': errors,
            'success_count': len(created_users),
            'error_count': len(errors)
        }

class UserActivitySerializer(serializers.Serializer):
    """Serializer for user activity data"""
    login_count = serializers.IntegerField()
    last_login = serializers.DateTimeField()
    actions_today = serializers.IntegerField()
    total_actions = serializers.IntegerField()
    
class UserStatsSerializer(serializers.ModelSerializer):
    """Serializer for user statistics"""
    user = UserSerializer(read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    activity = UserActivitySerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'role_name', 'company_name',
            'is_active', 'created_at', 'activity'
        ]

# class UserCreateSerializer(serializers.ModelSerializer):
#     password = serializers.CharField(write_only=True, validators=[validate_password])
#     password_confirm = serializers.CharField(write_only=True)
#     company_id = serializers.IntegerField(required=False, allow_null=True)

#     class Meta:
#         model = User
#         fields = [
#             'email', 'username', 'first_name', 'last_name', 'phone',
#             'is_company_admin', 'company_id', 'password', 'password_confirm'
#         ]

#     def validate(self, attrs):
#         if attrs['password'] != attrs['password_confirm']:
#             raise serializers.ValidationError("Passwords don't match")
        
#         # Validate company assignment permissions
#         request_user = self.context['request'].user
        
#         if not request_user.is_system_admin:
#             # Company admins can only create users for their own company
#             if not attrs.get('company_id') or attrs['company_id'] != request_user.company.id:
#                 raise serializers.ValidationError(
#                     "You can only create users for your own company"
#                 )
            
#             # Company admins cannot create other company admins
#             if attrs.get('is_company_admin', False):
#                 raise serializers.ValidationError(
#                     "Only system administrators can create company administrators"
#                 )

#         return attrs

#     def create(self, validated_data):
#         validated_data.pop('password_confirm')
#         password = validated_data.pop('password')
#         company_id = validated_data.pop('company_id', None)
        
#         if company_id:
#             try:
#                 company = Company.objects.get(id=company_id)
#                 validated_data['company'] = company
#             except Company.DoesNotExist:
#                 raise serializers.ValidationError("Invalid company ID")
        
#         validated_data['created_by'] = self.context['request'].user
#         validated_data['password_changed_at'] = timezone.now()
        
#         user = User.objects.create_user(
#             password=password,
#             **validated_data
#         )
#         return user

class UserInvitationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)

    class Meta:
        model = UserInvitation
        fields = [
            'id', 'email', 'company', 'company_name', 'is_company_admin',
            'invited_by_name', 'expires_at', 'is_used', 'created_at'
        ]
        read_only_fields = ['invited_by', 'invitation_token', 'expires_at']

    def create(self, validated_data):
        validated_data['invited_by'] = self.context['request'].user
        validated_data['invitation_token'] = secrets.token_urlsafe(32)
        validated_data['expires_at'] = timezone.now() + timedelta(days=7)
        
        # Set company for non-system admins
        request_user = self.context['request'].user
        if not request_user.is_system_admin:
            validated_data['company'] = request_user.company
            validated_data['is_company_admin'] = False  # Company admins can't create other admins
            
        return super().create(validated_data)

class UserListSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    role_display = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'is_active', 'is_company_admin', 'company_name', 'created_by_name',
            'role_display', 'last_login', 'date_joined'
        ]

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("No user found with this email address")