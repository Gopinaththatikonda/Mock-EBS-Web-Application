'use strict';

/*
 * DEMO ONLY: dummy application-level signup/login backed by browser localStorage.
 * Passwords are stored in plain text on purpose (mock requirement). This is NOT the
 * real authentication boundary; that is Nginx -> OAuth2 Proxy -> Keycloak (+ TOTP MFA).
 */
var EBS = (function () {
  var USERS_KEY = 'ebs_users';
  var SESSION_KEY = 'ebs_logged_in_user';

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function getUsers() {
    var users = read(USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function same(a, b) {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  function findUser(identifier) {
    return getUsers().find(function (u) {
      return same(u.username, identifier) || same(u.email, identifier);
    }) || null;
  }

  function register(user) {
    var users = getUsers();
    users.push(user);
    saveUsers(users);
  }

  function login(identifier, password) {
    var user = findUser(identifier);
    if (!user || user.password !== password) return null;
    var session = { name: user.name, username: user.username, email: user.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getSession() {
    var s = read(SESSION_KEY, null);
    return s && s.username ? s : null;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  // Redirect to the login page if there is no dummy session. Call before rendering.
  function requireSession() {
    var s = getSession();
    if (!s) window.location.replace('/');
    return s;
  }

  return {
    findUser: findUser,
    register: register,
    login: login,
    getSession: getSession,
    logout: logout,
    requireSession: requireSession,
  };
})();
