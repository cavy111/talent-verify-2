import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PersonAdd,
  Block,
  CheckCircle,
  Email,
  Cancel
} from '@mui/icons-material';
import { AuthService, userManagementService, CompanyService, User, UserInvitation, CreateUserData, InviteUserData } from '../services/api';
import { log } from 'console';
import NavBar from './NavBar';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_company_admin: false,
    company_id: undefined,
    password: '',
    password_confirm: ''
  });
  
  const [inviteForm, setInviteForm] = useState<InviteUserData>({
    email: '',
    company: undefined,
    is_company_admin: false
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
    fetchInvitations();
    fetchCompanies();
  }, []);

    const fetchCurrentUser = async () => {
    try {
      const response = await AuthService.getProfile();
      // console.log('here',response);
      setCurrentUser(response);
      
    } catch (err) {
      console.error('Failed to fetch current user');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userManagementService.getUsers();
      setUsers(response.data.results || response.data);
      // console.log(response)
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await userManagementService.getPendingInvitations();
      setInvitations(response.data);
    } catch (err) {
      console.error('Failed to fetch invitations');
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await CompanyService.getAll();
      setCompanies(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to fetch companies');
    }
  };

  const handleCreateUser = async () => {
    try {
      setError('');
      await userManagementService.createUser(createForm);
      setCreateDialog(false);
      resetCreateForm();
      setSuccess('User created successfully');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleInviteUser = async () => {
    try {
      setError('');
      await userManagementService.inviteUser(inviteForm);
      setInviteDialog(false);
      resetInviteForm();
      setSuccess('Invitation sent successfully');
      fetchInvitations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send invitation');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      setError('');
      if (user.is_active) {
        await userManagementService.deactivateUser(user.id);
        setSuccess(`User ${user.first_name} ${user.last_name} deactivated`);
      } else {
        await userManagementService.activateUser(user.id);
        setSuccess(`User ${user.first_name} ${user.last_name} activated`);
      }
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      email: '',
      username: '',
      first_name: '',
      last_name: '',
      phone: '',
      is_company_admin: false,
      company_id: undefined,
      password: '',
      password_confirm: ''
    });
  };

  const resetInviteForm = () => {
    setInviteForm({
      email: '',
      company: undefined,
      is_company_admin: false
    });
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const canManageUsers = currentUser?.role_name === 'talent_verify_admin' || currentUser?.role_name == 'company_admin';
  const isSystemAdmin = currentUser?.role_name === 'talent_verify_admin';

    return (
    <>
      <NavBar role_name={currentUser?.role_name || ''} page='Manage Users'/>

      <Container sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">User Management</Typography>
          {canManageUsers && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Email />}
                onClick={() => setInviteDialog(true)}
              >
                Invite User
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialog(true)}
              >
                Create User
              </Button>
            </Box>
          )}
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
            onClose={() => setSuccess('')}
          >
            {success}
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
          <Tab label={`Active Users (${users.length})`} />
          <Tab label={`Pending Invitations (${invitations.length})`} />
        </Tabs>

        {/* Users Tab */}
        {tabValue === 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Joined</TableCell>
                  {canManageUsers && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.first_name} {user.last_name}
                          </Typography>
                          {user.phone && (
                            <Typography variant="caption" color="text.secondary">
                              {user.phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role_display} 
                          color={user.is_company_admin ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{user.company_name || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.is_active ? 'Active' : 'Inactive'} 
                          color={user.is_active ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        {new Date(user.date_joined).toLocaleDateString()}
                      </TableCell>
                      {canManageUsers && (
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {user.id !== currentUser?.id && (
                              <Tooltip title={user.is_active ? 'Deactivate User' : 'Activate User'}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleUserStatus(user)}
                                  color={user.is_active ? 'error' : 'success'}
                                >
                                  {user.is_active ? <Block /> : <CheckCircle />}
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Invitations Tab */}
        {tabValue === 1 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Invited By</TableCell>
                  <TableCell>Sent Date</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No pending invitations
                    </TableCell>
                  </TableRow>
                ) : (
                  invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={invitation.is_company_admin ? 'Company Admin' : 'Company User'} 
                          color={invitation.is_company_admin ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{invitation.company_name || 'System'}</TableCell>
                      <TableCell>{invitation.invited_by_name}</TableCell>
                      <TableCell>
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2"
                          color={new Date(invitation.expires_at) < new Date() ? 'error' : 'text.primary'}
                        >
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={new Date(invitation.expires_at) < new Date() ? 'Expired' : 'Pending'} 
                          color={new Date(invitation.expires_at) < new Date() ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create User Dialog */}
        <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create New User</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="First Name"
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  label="Last Name"
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                  fullWidth
                  required
                />
              </Box>
              
              <TextField
                label="Email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ 
                  ...createForm, 
                  email: e.target.value,
                  username: e.target.value // Auto-set username to email
                })}
                fullWidth
                required
              />
              
              <TextField
                label="Phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                fullWidth
              />

              {isSystemAdmin && (
                <FormControl fullWidth>
                  <InputLabel>Company</InputLabel>
                  <Select
                    value={createForm.company_id || ''}
                    onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value as number })}
                  >
                    <MenuItem value="">Select Company</MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {isSystemAdmin && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={createForm.is_company_admin}
                      onChange={(e) => setCreateForm({ ...createForm, is_company_admin: e.target.checked })}
                    />
                  }
                  label="Company Administrator"
                />
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  value={createForm.password_confirm}
                  onChange={(e) => setCreateForm({ ...createForm, password_confirm: e.target.value })}
                  fullWidth
                  required
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateUser} 
              variant="contained"
              disabled={!createForm.email || !createForm.password || createForm.password !== createForm.password_confirm}
            >
              Create User
            </Button>
          </DialogActions>
        </Dialog>

        {/* Invite User Dialog */}
        <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Email Address"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                fullWidth
                required
                helperText="An invitation email will be sent to this address"
              />

              {isSystemAdmin && (
                <FormControl fullWidth>
                  <InputLabel>Company</InputLabel>
                  <Select
                    value={inviteForm.company || ''}
                    onChange={(e) => setInviteForm({ ...inviteForm, company: e.target.value as number })}
                  >
                    <MenuItem value="">Select Company</MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {isSystemAdmin && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={inviteForm.is_company_admin}
                      onChange={(e) => setInviteForm({ ...inviteForm, is_company_admin: e.target.checked })}
                    />
                  }
                  label="Company Administrator Role"
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleInviteUser} 
              variant="contained"
              disabled={!inviteForm.email}
              startIcon={<Email />}
            >
              Send Invitation
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

export default UserManagement