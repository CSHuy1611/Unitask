const isProductionOrDocker = !window.location.hostname.includes('localhost') || window.location.port === '80' || window.location.port === '';
export const API_BASE_URL = isProductionOrDocker 
  ? `${window.location.protocol}//${window.location.host}/api`
  : 'http://localhost:5250/api';
