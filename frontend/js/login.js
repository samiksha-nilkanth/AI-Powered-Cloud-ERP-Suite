document.addEventListener('DOMContentLoaded', () => {
    if (!requireGuest()) return;

    const gotoRegister = document.getElementById('goto-register');
    if (gotoRegister && window.location.search) {
        gotoRegister.setAttribute('href', 'register.html' + window.location.search);
    }

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const passwordToggle = document.getElementById('password-toggle');
    const loginBtn = document.getElementById('login-btn');
    const googleBtn = document.getElementById('google-login-btn');
    const phoneBtn = document.getElementById('phone-login-btn');
    const phoneModal = document.getElementById('phone-modal');
    const phoneInput = document.getElementById('phone-number');
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const phoneStep1 = document.getElementById('phone-step-1');
    const phoneStep2 = document.getElementById('phone-step-2');

    function getRedirectAndSaveRole() {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || 'dashboard.html';
        setUserRole(getRoleFromPage(redirect));
        return redirect;
    }

    function handleLoginSuccess(result) {
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

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert('login-alert');
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password) {
            showAlert('login-alert', 'Please fill in all fields');
            return;
        }
        setButtonLoading(loginBtn, true);
        try {
            const result = await AuthAPI.login(email, password);
            if (result.success) {
                const redirect = handleLoginSuccess(result);
                passwordInput.value = '';
                showToast('Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.replace(redirect);
                }, 800);
            } else {
                showAlert('login-alert', result.error || 'Login failed');
            }
        } catch (err) {
            showAlert('login-alert', 'Network error. Please check your connection.');
        } finally {
            setButtonLoading(loginBtn, false);
        }
    });

    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
    });

    googleBtn.addEventListener('click', async () => {
        setButtonLoading(googleBtn, true);
        try {
            const demoProfile = {
                sub: 'google-demo-admin',
                email: 'admin@amdox.com',
                name: 'Amdox Admin',
                picture: 'https://ui-avatars.com/api/?name=Amdox+Admin&background=4285F4&color=fff'
            };
            const result = await AuthAPI.googleLoginWithProfile(demoProfile);
            if (result.success) {
                const redirect = handleLoginSuccess(result);
                showToast('Google login successful!');
                setTimeout(() => {
                    window.location.replace(redirect);
                }, 800);
            } else {
                showAlert('login-alert', result.error || 'Google login failed');
            }
        } catch (err) {
            showAlert('login-alert', 'Google login failed. Please try again.');
        } finally {
            setButtonLoading(googleBtn, false);
        }
    });

    window.handleGoogleCredential = async function(response) {
        setButtonLoading(googleBtn, true);
        try {
            const result = await AuthAPI.googleLogin(response.credential);
            if (result.success) {
                const redirect = handleLoginSuccess(result);
                showToast('Google login successful!');
                setTimeout(() => {
                    window.location.replace(redirect);
                }, 800);
            } else {
                showAlert('login-alert', result.error || 'Google login failed');
            }
        } catch (err) {
            showAlert('login-alert', 'Failed to complete Google login');
        } finally {
            setButtonLoading(googleBtn, false);
        }
    };

    phoneBtn.addEventListener('click', () => {
        phoneModal.classList.add('visible');
        phoneStep1.classList.add('active');
        phoneStep2.classList.remove('active');
        hideAlert('phone-alert');
    });

    closeModalBtn.addEventListener('click', () => {
        phoneModal.classList.remove('visible');
    });

    phoneModal.addEventListener('click', (e) => {
        if (e.target === phoneModal) {
            phoneModal.classList.remove('visible');
        }
    });

    sendOtpBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        hideAlert('phone-alert');
        if (!phone) {
            showAlert('phone-alert', 'Please enter your phone number');
            return;
        }
        setButtonLoading(sendOtpBtn, true);
        try {
            const result = await AuthAPI.sendOTP(phone);
            if (result.success) {
                phoneStep1.classList.remove('active');
                phoneStep2.classList.add('active');
                startOTPTimer();
                if (result.data && result.data.devOtp) {
                    const otpDigits = result.data.devOtp.split('');
                    const inputs = document.querySelectorAll('.otp-input');
                    otpDigits.forEach((digit, i) => {
                        if (inputs[i]) inputs[i].value = digit;
                    });
                    showToast('OTP auto-filled (dev mode): ' + result.data.devOtp);
                } else {
                    showToast('OTP sent to ' + phone);
                    const firstInput = document.querySelector('.otp-input');
                    if (firstInput) firstInput.focus();
                }
            } else {
                showAlert('phone-alert', result.error || 'Failed to send OTP');
            }
        } catch (err) {
            showAlert('phone-alert', 'Network error. Please try again.');
        } finally {
            setButtonLoading(sendOtpBtn, false);
        }
    });

    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    verifyOtpBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        const code = Array.from(otpInputs).map(i => i.value).join('');
        hideAlert('phone-alert');
        if (code.length !== 6) {
            showAlert('phone-alert', 'Please enter the complete 6-digit OTP');
            return;
        }
        setButtonLoading(verifyOtpBtn, true);
        try {
            const result = await AuthAPI.verifyOTP(phone, code);
            if (result.success) {
                const redirect = handleLoginSuccess(result);
                phoneModal.classList.remove('visible');
                showToast(result.data.isNewUser ? 'Account created! Redirecting...' : 'Login successful!');
                setTimeout(() => {
                    window.location.replace(redirect);
                }, 800);
            } else {
                showAlert('phone-alert', result.error || 'Invalid OTP');
                otpInputs.forEach(i => i.value = '');
                otpInputs[0].focus();
            }
        } catch (err) {
            showAlert('phone-alert', 'Verification failed. Please try again.');
        } finally {
            setButtonLoading(verifyOtpBtn, false);
        }
    });

    function startOTPTimer() {
        let seconds = 300;
        const timerEl = document.getElementById('otp-timer');
        const resendLink = document.getElementById('resend-otp');
        if (resendLink) resendLink.style.display = 'none';
        const interval = setInterval(() => {
            seconds--;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerEl.textContent = `Resend in ${mins}:${secs.toString().padStart(2, '0')}`;
            if (seconds <= 0) {
                clearInterval(interval);
                timerEl.textContent = '';
                if (resendLink) resendLink.style.display = 'inline';
            }
        }, 1000);
    }
});
