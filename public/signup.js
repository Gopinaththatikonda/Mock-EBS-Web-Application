'use strict';

(function () {
  var form = document.getElementById('signup-form');
  var alertBox = document.getElementById('alert');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var USERNAME_RE = /^[A-Za-z0-9._-]{3,30}$/;

  function setError(field, text) {
    form.querySelector('.field-error[data-for="' + field + '"]').textContent = text || '';
    form.elements[field].classList.toggle('invalid', Boolean(text));
  }

  function showAlert(text, type) {
    alertBox.textContent = text;
    alertBox.className = 'alert alert-' + type;
    alertBox.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    alertBox.hidden = true;

    var v = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      username: form.elements.username.value.trim(),
      password: form.elements.password.value,
      confirm: form.elements.confirm.value,
    };
    var errors = {};

    if (!v.name) errors.name = 'Full name is required.';

    if (!v.email) errors.email = 'Email is required.';
    else if (!EMAIL_RE.test(v.email)) errors.email = 'Enter a valid email address.';
    else if (EBS.findUser(v.email)) errors.email = 'An account with this email already exists.';

    if (!v.username) errors.username = 'Username is required.';
    else if (!USERNAME_RE.test(v.username)) errors.username = '3-30 characters: letters, numbers, . _ -';
    else if (EBS.findUser(v.username)) errors.username = 'This username is already taken.';

    if (!v.password) errors.password = 'Password is required.';
    else if (v.password.length < 8) errors.password = 'Password must be at least 8 characters.';

    if (!v.confirm) errors.confirm = 'Please confirm your password.';
    else if (v.password !== v.confirm) errors.confirm = 'Passwords do not match.';

    ['name', 'email', 'username', 'password', 'confirm'].forEach(function (f) {
      setError(f, errors[f]);
    });

    if (Object.keys(errors).length) {
      showAlert('Please correct the highlighted fields.', 'error');
      return;
    }

    EBS.register({ name: v.name, username: v.username, email: v.email, password: v.password });

    form.querySelector('button[type="submit"]').disabled = true;
    showAlert('Account created successfully. Redirecting to sign in…', 'success');
    setTimeout(function () {
      window.location.replace('/?registered=1');
    }, 1500);
  });
})();
