const USER_KEY = 'user';
const DARK_MODE = 'dark_mode';

export function saveDarkMode(state) {
  localStorage.setItem(DARK_MODE, JSON.stringify(state));
}

export function getDarkMode() {
  return localStorage.getItem(JSON.parse(DARK_MODE));
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  const userString = localStorage.getItem(USER_KEY);
  return userString ? JSON.parse(userString) : null;
}

export function resetLocalStorage() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    localStorage.setItem(key, '');
  }
}
