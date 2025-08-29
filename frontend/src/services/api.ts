import axios from "axios";

const BASE_API = 'http://127.0.0.1:8000/api/'

const api = axios.create({
    baseURL : BASE_API,
    headers:{
        'Content-Type' : 'application/json'
    } 
})

api.interceptors.request.use((config)=>{
    const token = localStorage.getItem('access_token')
    if (token){
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(response=>response, async(error) =>{
    if (error.response?.status === 401){
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
    }
    return Promise.reject(error)
})

export default api;

export const AuthService = {
    login : async(username: string, password: string) =>{
        const response = await axios.post(`${BASE_API}auth/login/`,{username,password})
        return response.data
    },
    logout : () =>{
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh')
    },
    getProfile : async() => {
      const response = await api.get('auth/profile/')
      return response.data
    }
}

export const CompanyService = {
    getAll : (params?: any) => api.get('companies/', {params}),
    getById : (id: number) => api.get(`companies/${id}`),
    create : (data: any) => api.post('companies/', data),
    update : (id:number,data: any) => api.put(`companies/${id}`,data),
    delete : (id:number) => api.delete(`companies/${id}`)
}

export const employeeService = {
  getAll: (params?: any) => api.get('/employees/', { params }),
  getById: (id: number) => api.get(`/employees/${id}/`),
  create: (data: any) => api.post('/employees/', data),
  update: (id: number, data: any) => api.put(`/employees/${id}/`, data),
  delete: (id: number) => api.delete(`/employees/${id}/`),
};

// Bulk upload service  
export const bulkUploadService = {
  getJobs: (params?: any) => api.get('/bulk-upload/', { params }),
  createJob: (data: FormData) => api.post('/bulk-upload/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getJob: (id: string) => api.get(`/bulk-upload/${id}/`),
  retryJob: (id: string) => api.post(`/bulk-upload/${id}/retry/`),
  downloadTemplate: (type: string) => api.get(`/bulk-upload/download_template/?type=${type}`, {
    responseType: 'blob'
  })
};

// export const bulkUploadService = {
//   uploadCompanies: (file: File) => {
//     const formData = new FormData();
//     formData.append('file', file);
//     return api.post('/bulk-upload/upload_companies/', formData, {
//       headers: { 'Content-Type': 'multipart/form-data' }
//     });
//   },

//   uploadEmployees: (file: File) => {
//     const formData = new FormData();
//     formData.append('file', file);
//     return api.post('/bulk-upload/upload_employees/', formData, {
//       headers: { 'Content-Type': 'multipart/form-data' }
//     });
//   },

//   getJobStatus: (jobId: string) => api.get(`/bulk-upload/${jobId}/status/`),
  
//   getJobErrors: (jobId: string) => api.get(`/bulk-upload/${jobId}/errors/`),

//   getTemplate: (type: 'company' | 'employee') => 
//     api.get(`/bulk-upload/templates/?type=${type}`),
    
//   getJobs: () => api.get('/bulk-upload/'),
//   getJob: (id: string) => api.get(`/bulk-uploads/${id}/`),
//   retryJob: (id: string) => api.post(`/bulk-uploads/${id}/retry/`),
//   downloadTemplate: (type: string) => api.get(`/bulk-uploads/download_template/?type=${type}`, {
//     responseType: 'blob'
//   }),
//   createJob: (data: FormData) => api.post('/bulk-uploads/', data, {
//     headers: { 'Content-Type': 'multipart/form-data' }
//   }),
// }

// Audit service
export const auditService = {
  getLogs: (params?: any) => api.get('/audit-logs/', { params }),
  getAnalytics: (days = 30) => api.get(`/audit-logs/analytics/?days=${days}`),
  getRecentActivity: () => api.get('/audit-logs/recent_activity/'),
  getLogById: (id: number) => api.get(`/audit/${id}/`),
  getSecurityEvents: (params?: any) => api.get('/security-events/', { params }),
  getSecurityDashboard: () => api.get('/security-events/dashboard/'),
  resolveSecurityEvent: (id: string, notes: string) => 
    api.post(`/security-events/${id}/resolve/`, { notes }),
};

// Enhanced employee service with filters
export const employeeServiceEnhanced = {
  ...employeeService,
  search: (filters: {
    name?: string;
    company?: string;
    department?: string;
    role?: string;
    employment_type?: string;
    year_started?: number;
    year_left?: number;
    is_current?: boolean;
    experience_years?: number;
  }) => api.get('/employees/', { params: filters }),
  
  getHistory: (id: number) => api.get(`/employees/${id}/history/`),
  
  addPosition: (employeeId: number, positionData: any) => 
    api.post(`/employees/${employeeId}/add_position/`, positionData),
    
  getAnalytics: () => api.get('/employees/analytics/'),
  
  export: (filters?: any) => api.get('/employees/export/', { params: filters }),
};

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  is_company_admin: boolean;
  company_name: string;
  created_by_name: string;
  role_display: string;
  last_login: string;
  date_joined: string;
}

export interface UserInvitation {
  id: number;
  email: string;
  company: number;
  company_name: string;
  is_company_admin: boolean;
  invited_by_name: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
}

export interface CreateUserData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_company_admin: boolean;
  company_id?: number;
  password: string;
  password_confirm: string;
}

export interface InviteUserData {
  email: string;
  company?: number;
  is_company_admin: boolean;
}

export const userManagementService = {
  // User CRUD operations
  getUsers: (params?: any) => api.get('/users/', { params }),
  createUser: (data: CreateUserData) => api.post('/users/', data),
  updateUser: (id: number, data: Partial<CreateUserData>) => api.put(`/users/${id}/`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}/`),
  
  // User actions
  deactivateUser: (id: number) => api.post(`/users/${id}/deactivate_user/`),
  activateUser: (id: number) => api.post(`/users/${id}/activate_user/`),
  
  // Invitation system
  inviteUser: (data: InviteUserData) => api.post('/users/invite_user/', data),
  getPendingInvitations: () => api.get('/users/pending_invitations/'),
  acceptInvitation: (data: {
    token: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) => api.post('/users/accept_invitation/', data),
};