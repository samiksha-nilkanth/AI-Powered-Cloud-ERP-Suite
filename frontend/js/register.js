document.addEventListener('DOMContentLoaded', () => {
    if (!requireGuest()) return;

    const gotoLogin = document.getElementById('goto-login');
    if (gotoLogin && window.location.search) {
        gotoLogin.setAttribute('href', 'login.html' + window.location.search);
    }

    function getRedirectAndSaveRole() {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || 'dashboard.html';
        setUserRole(getRoleFromPage(redirect));
        return redirect;
    }

    function handleRegisterSuccess(result) {
        storeAuthData(result.data);
        const isAdmin = result.data.user && result.data.user.role === 'super_admin';
        let redirect;
        if (isAdmin) {
            setUserRole('dashboard');
            redirect = 'dashboard.html';
        } else {
            redirect = getRedirectAndSaveRole();
        }
        return redirect;
    }

    const registerForm = document.getElementById('register-form');
    const fullNameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const phoneInput = document.getElementById('register-phone');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    const passwordToggle = document.getElementById('password-toggle');
    const confirmPasswordToggle = document.getElementById('confirm-password-toggle');
    const termsCheckbox = document.getElementById('terms-checkbox');
    const registerBtn = document.getElementById('register-btn');
    const googleBtn = document.getElementById('google-register-btn');
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');

    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const strength = checkPasswordStrength(password);
        strengthFill.className = 'strength-fill ' + strength.level;
        strengthText.textContent = strength.text;
        strengthText.style.color = strength.color;
    });

    function checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;
        if (score <= 1) return { level: 'weak', text: 'Weak password', color: 'var(--text-error)' };
        if (score <= 2) return { level: 'fair', text: 'Fair password', color: 'var(--text-warning)' };
        if (score <= 3) return { level: 'good', text: 'Good password', color: 'var(--brand-secondary)' };
        return { level: 'strong', text: 'Strong password', color: 'var(--text-success)' };
    }

    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFieldError('email-error', 'Please enter a valid email address');
            emailInput.classList.add('error');
        } else {
            hideFieldError('email-error');
            emailInput.classList.remove('error');
        }
    });

    confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value) {
            showFieldError('confirm-password-error', 'Passwords do not match');
            confirmPasswordInput.classList.add('error');
        } else {
            hideFieldError('confirm-password-error');
            confirmPasswordInput.classList.remove('error');
        }
    });

    function showFieldError(id, message) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = message;
            el.classList.add('visible');
        }
    }

    function hideFieldError(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('visible');
    }

    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
    });

    confirmPasswordToggle.addEventListener('click', () => {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        confirmPasswordToggle.textContent = type === 'password' ? '👁️' : '🙈';
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert('register-alert');
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        if (!fullName || !email || !password || !confirmPassword) {
            showAlert('register-alert', 'Please fill in all required fields');
            return;
        }
        if (fullName.length < 2) {
            showAlert('register-alert', 'Full name must be at least 2 characters');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showAlert('register-alert', 'Please enter a valid email address');
            return;
        }
        if (password.length < 8) {
            showAlert('register-alert', 'Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            showAlert('register-alert', 'Passwords do not match');
            return;
        }
        if (!termsCheckbox.checked) {
            showAlert('register-alert', 'Please agree to the Terms & Conditions');
            return;
        }
        setButtonLoading(registerBtn, true);
        try {
            const result = await AuthAPI.register({
                fullName,
                email,
                phone: phone || undefined,
                password
            });
            if (result.success) {
                const redirect = handleRegisterSuccess(result);
                showToast('Account created successfully! Redirecting...');
                setTimeout(() => {
                    window.location.replace(redirect);
                }, 800);
            } else {
                const errorMsg = result.details
                    ? result.details.join('. ')
                    : (result.error || 'Registration failed');
                showAlert('register-alert', errorMsg);
            }
        } catch (err) {
            showAlert('register-alert', 'Network error. Please check your connection.');
        } finally {
            setButtonLoading(registerBtn, false);
        }
    });

    googleBtn.addEventListener('click', async () => {
        setButtonLoading(googleBtn, true);
        try {
            const demoProfile = {
                sub: 'google-demo-' + Date.now(),
                email: 'demo@amdox.com',
                name: 'Amdox User',
                picture: 'https://ui-avatars.com/api/?name=Amdox+User&background=34A853&color=fff'
            };
            const result = await AuthAPI.googleLoginWithProfile(demoProfile);
            if (result.success) {
                const redirect = handleRegisterSuccess(result);
                showToast('Google signup successful!');
                setTimeout(() => {
                    window.location.replace(redirect);
                }, 800);
            } else {
                showAlert('register-alert', result.error || 'Google signup failed');
            }
        } catch (err) {
            showAlert('register-alert', 'Google signup failed. Please try again.');
        } finally {
            setButtonLoading(googleBtn, false);
        }
    });

    window.handleGoogleCredential = async function(response) {
        setButtonLoading(googleBtn, true);
        try {
            const result = await AuthAPI.googleLogin(response.credential);
            if (result.success) {
                const redirect = handleRegisterSuccess(result);
                showToast('Google signup successful!');
                setTimeout(() => {
                    window.location.replace(redirect);
                }, 800);
            } else {
                showAlert('register-alert', result.error || 'Google signup failed');
            }
        } catch (err) {
            showAlert('register-alert', 'Failed to complete Google signup');
        } finally {
            setButtonLoading(googleBtn, false);
        }
    };
});
