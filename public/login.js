'use strict';

(function () {
  var form = document.getElementById('login-form');
  var alertBox = document.getElementById('alert');

  function showAlert(text, type) {
    alertBox.textContent = text;
    alertBox.className = 'alert alert-' + type;
    alertBox.hidden = false;
  }

  if (new URLSearchParams(window.location.search).get('registered') === '1') {
    showAlert('Account created successfully. Please sign in.', 'success');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var identifier = form.identifier.value.trim();
    var password = form.password.value;

    if (!identifier || !password) {
      showAlert('Please enter your username/email and password.', 'error');
      return;
    }

    if (!EBS.login(identifier, password)) {
      showAlert('Invalid username/email or password', 'error');
      form.password.value = '';
      form.password.focus();
      return;
    }

    window.location.replace('/dashboard');
  });
})();
