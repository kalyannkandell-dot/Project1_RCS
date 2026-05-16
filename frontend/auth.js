function getAuthHeaders() {
  const token = localStorage.getItem('hc_token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

function getAuthHeadersNoContent() {
  const token = localStorage.getItem('hc_token')
  return { 'Authorization': `Bearer ${token}` }
}

function logout() {
  localStorage.removeItem('hc_token')
  window.location.href = '/login.html'
}

function requireAuth() {
  if (!localStorage.getItem('hc_token')) {
    window.location.href = '/login.html'
  }
}