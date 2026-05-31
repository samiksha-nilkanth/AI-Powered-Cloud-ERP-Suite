const APP_CONFIG = {
    API_BASE: 'http://localhost:5000/api',
    APP_NAME: 'Amdox ERP',
    TOKEN_KEY: 'amdox_access_token',
    REFRESH_KEY: 'amdox_refresh_token',
    USER_KEY: 'amdox_user',
    ROLE_KEY: 'amdox_user_role'
};

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showAlert(elementId, message, type = 'error') {
    const alert = document.getElementById(elementId);
    if (!alert) return;
    alert.className = `alert alert-${type} visible`;
    alert.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span><span>${message}</span>`;
}

function hideAlert(elementId) {
    const alert = document.getElementById(elementId);
    if (!alert) return;
    alert.classList.remove('visible');
}

function setButtonLoading(btn, loading) {
    if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function isAuthenticated() {
    return !!localStorage.getItem(APP_CONFIG.TOKEN_KEY);
}

function getUserRole() {
    return localStorage.getItem(APP_CONFIG.ROLE_KEY) || 'dashboard';
}

function setUserRole(role) {
    localStorage.setItem(APP_CONFIG.ROLE_KEY, role);
}

function isAdminUser() {
    try {
        const userData = localStorage.getItem(APP_CONFIG.USER_KEY);
        if (!userData) return false;
        const user = JSON.parse(userData);
        return user.role === 'super_admin';
    } catch {
        return false;
    }
}

function getRoleFromPage(page) {
    const map = {
        'dashboard.html': 'dashboard',
        'hr.html': 'hr',
        'finance.html': 'finance',
        'supply.html': 'supply',
        'projects.html': 'projects',
        'forecast.html': 'forecast',
        'analytics.html': 'analytics'
    };
    return map[page] || 'dashboard';
}

function getPageFromRole(role) {
    const map = {
        'dashboard': 'dashboard.html',
        'hr': 'hr.html',
        'finance': 'finance.html',
        'supply': 'supply.html',
        'projects': 'projects.html',
        'forecast': 'forecast.html',
        'analytics': 'analytics.html'
    };
    return map[role] || 'dashboard.html';
}

function requireAuth() {
    if (!isAuthenticated()) {
        window.location.replace('login.html');
        return false;
    }
    return true;
}

function requireGuest() {
    if (isAuthenticated()) {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        if (redirect) {
            const role = getRoleFromPage(redirect);
            setUserRole(role);
            window.location.replace(redirect);
        } else {
            const role = getUserRole();
            window.location.replace(getPageFromRole(role));
        }
        return false;
    }
    return true;
}

function getStoredUser() {
    try {
        const userData = localStorage.getItem(APP_CONFIG.USER_KEY);
        return userData ? JSON.parse(userData) : null;
    } catch {
        return null;
    }
}

function storeAuthData(data) {
    localStorage.setItem(APP_CONFIG.TOKEN_KEY, data.accessToken);
    localStorage.setItem(APP_CONFIG.REFRESH_KEY, data.refreshToken);
    localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(data.user));
}

function clearAuthData() {
    localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
    localStorage.removeItem(APP_CONFIG.REFRESH_KEY);
    localStorage.removeItem(APP_CONFIG.USER_KEY);
    localStorage.removeItem(APP_CONFIG.ROLE_KEY);
}

function getUserInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
}

document.addEventListener('DOMContentLoaded', () => {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = '<div class="loader-spinner"></div><div class="loader-text">AMDOX ERP</div>';
    document.body.prepend(loader);
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
    }, 1000);

    const currentPage = window.location.pathname.split('/').pop();
    const isAuthPage = ['login.html', 'register.html', 'index.html', ''].includes(currentPage);

    if (!isAuthPage) {
        const aiContainer = document.createElement('div');
        aiContainer.innerHTML = `
            <div id="ai-assistant-fab">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <circle cx="12" cy="5" r="2"></circle>
                    <path d="M12 7v4"></path>
                    <line x1="8" y1="16" x2="8" y2="16"></line>
                    <line x1="16" y1="16" x2="16" y2="16"></line>
                </svg>
            </div>
            <div id="ai-assistant-window">
                <div class="ai-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>🤖</span> Amdox AI Assistant
                    </div>
                    <button id="ai-close-btn" style="background:none; border:none; color:white; cursor:pointer; font-size: 1.2rem;">✕</button>
                </div>
                <div class="ai-body" id="ai-chat-body">
                    <div class="ai-msg bot">Hello! I'm your Amdox ERP Assistant. How can I help you today?</div>
                </div>
                <div class="ai-input">
                    <input type="text" id="ai-chat-input" placeholder="Type a message...">
                    <button id="ai-send-btn">➤</button>
                </div>
            </div>
        `;
        document.body.appendChild(aiContainer);

        const fab = document.getElementById('ai-assistant-fab');
        const win = document.getElementById('ai-assistant-window');
        const closeBtn = document.getElementById('ai-close-btn');
        const chatInput = document.getElementById('ai-chat-input');
        const sendBtn = document.getElementById('ai-send-btn');
        const chatBody = document.getElementById('ai-chat-body');

        fab.addEventListener('click', () => win.classList.toggle('open'));
        closeBtn.addEventListener('click', () => win.classList.remove('open'));

        function sendMessage() {
            const text = chatInput.value.trim();
            if (!text) return;
            chatBody.innerHTML += `<div class="ai-msg user">${text}</div>`;
            chatInput.value = '';
            chatBody.scrollTop = chatBody.scrollHeight;
            setTimeout(() => {
                chatBody.innerHTML += `<div class="ai-msg bot">I am processing your request regarding "${text}". Please wait while I pull up the insights!</div>`;
                chatBody.scrollTop = chatBody.scrollHeight;
            }, 1000);
        }

        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) {
        const role = getUserRole();
        const admin = isAdminUser();
        if (!admin) {
            const links = sidebarNav.querySelectorAll('li');
            links.forEach(li => {
                const a = li.querySelector('a');
                if (!a) return;
                const href = a.getAttribute('href');
                const linkRole = getRoleFromPage(href);
                if (linkRole !== role) {
                    li.style.display = 'none';
                }
            });
        }
    }

    window.addEventListener('pageshow', (e) => {
        const page = window.location.pathname.split('/').pop();
        if ((page === 'login.html' || page === 'register.html') && isAuthenticated()) {
            const role = getUserRole();
            window.location.replace(getPageFromRole(role));
        }
    });

    if (!isAuthPage && sidebarNav) {
        const role = getUserRole();
        const admin = isAdminUser();
        const expectedPage = getPageFromRole(role);
        if (!admin && currentPage !== expectedPage) {
            window.location.replace(expectedPage);
        }
    }

   
    document.body.addEventListener("click", (e) => {
        if (e.target.classList.contains("tab-btn")) {
            const tabsContainer = e.target.closest(".dashboard-content");
            if (!tabsContainer) return;
            
            tabsContainer.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
            tabsContainer.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
            
            e.target.classList.add("active");
            const targetId = e.target.getAttribute("data-tab");
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add("active");
        }
    });
});
