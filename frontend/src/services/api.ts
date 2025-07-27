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
        const response = await api.post('auth/login/',{username,password})
        return response.data
    },
    logout : () =>{
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh')
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