import axios from 'axios'

export const API_BASE = 'http://localhost:3000' // change to your server IP if needed

const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cc_admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cc_admin_token')
      localStorage.removeItem('cc_admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data || err)
  }
)

/** Upload a notice attachment (multipart). Returns { fileUrl, fileName, fileType, fileSize }. */
export async function uploadNoticeFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  const token = localStorage.getItem('cc_admin_token')
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.message || 'Upload failed')
  return json.data
}

export default api
