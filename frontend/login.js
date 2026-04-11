/**
 * Login/Register JavaScript with Translation Support
 * Handles user authentication and language switching
 */

// Translation State
let currentLanguage = localStorage.getItem('language') || 'en';
let translations = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    
    // Load translations first
    loadTranslations(currentLanguage).then(() => {
        // Initialize the page after translations are loaded
        initializeLoginPage();
    });
});

// Translation Functions
async function loadTranslations(lang) {
    try {
        const response = await fetch(`https://backend-production.up.railway.app/api/translations/${lang}`);
        translations = await response.json();
        currentLanguage = lang;
        localStorage.setItem('language', lang);
        updateLoginUILanguage();
    } catch (error) {
        console.error('Failed to load translations:', error);
    }
}

function t(key) {
    return translations[key] || key;
}

function updateLoginUILanguage() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
}

function initializeLoginPage() {
    // Set up form switching first
    setupFormSwitching();
    
    // Set up form handlers
    setupLoginForm();
    setupRegisterForm();
    
    // Setup language switcher
    const languageSwitch = document.getElementById('loginLanguageSwitch');
    if (languageSwitch) {
        languageSwitch.value = currentLanguage;
        languageSwitch.addEventListener('change', (e) => {
            loadTranslations(e.target.value);
        });
    }
    
    // Show login form by default
    showLoginForm();
}

function setupFormSwitching() {
    const showLoginLink = document.getElementById('show-login');
    const showRegisterLink = document.getElementById('show-register');
    
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
    }
    
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterForm();
        });
    }
}

function showLoginForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    
    // Clear any error/success messages
    clearMessages();
}

function showRegisterForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    
    // Clear any error/success messages
    clearMessages();
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('Login form not found');
        return;
    }
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const username = document.getElementById('login-username');
        const pin = document.getElementById('login-pin');
        const loginBtn = document.getElementById('login-btn');
        const errorElement = document.getElementById('login-error');
        
        if (!username || !pin || !loginBtn) {
            console.error('Login form elements not found');
            return;
        }
        
        const usernameValue = username.value.trim();
        const pinValue = pin.value;
        
        // Validation
        if (!usernameValue) {
            showError(errorElement, t('error') + ': Please enter your username');
            username.focus();
            return;
        }
        
        if (!pinValue) {
            showError(errorElement, t('error') + ': Please enter your PIN');
            pin.focus();
            return;
        }
        
        if (pinValue.length < 4) {
            showError(errorElement, t('error') + ': PIN must be at least 4 digits');
            pin.focus();
            return;
        }
        
        // Show loading state
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        const originalText = btnText ? btnText.textContent : t('sign_in');
        
        if (btnText) btnText.textContent = 'Signing in...';
        if (btnLoader) btnLoader.style.display = 'inline-block';
        loginBtn.disabled = true;
        
        // Clear previous errors
        if (errorElement) errorElement.textContent = '';
        
        console.log('Attempting login for:', usernameValue);
        
        fetch('https://backend-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username: usernameValue,
                pin: pinValue
            })
        })
        .then(response => {
            console.log('Login response status:', response.status);
            
            if (response.status === 200) {
                return response.json();
            } else if (response.status === 401) {
                throw new Error('Invalid username or PIN');
            } else if (response.status === 400) {
                throw new Error('Please fill in all fields');
            } else {
                throw new Error('Login failed. Please try again.');
            }
        })
        .then(data => {
            console.log('Login successful:', data);
            
            // Show success message
            if (errorElement) {
                errorElement.textContent = 'Login successful! Redirecting...';
                errorElement.style.color = '#10b981';
            }
            
            // Redirect to main app after a brief delay
            setTimeout(() => {
                window.location.href = '/app';
            }, 1000);
        })
        .catch(error => {
            console.error('Login error:', error);
            showError(errorElement, error.message);
        })
        .finally(() => {
            // Reset button state
            if (btnText) btnText.textContent = originalText;
            if (btnLoader) btnLoader.style.display = 'none';
            loginBtn.disabled = false;
        });
    });
}

function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) {
        console.error('Register form not found');
        return;
    }
    
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const username = document.getElementById('register-username');
        const email = document.getElementById('register-email');
        const pin = document.getElementById('register-pin');
        const pinConfirm = document.getElementById('register-pin-confirm');
        const registerBtn = document.getElementById('register-btn');
        const errorElement = document.getElementById('register-error');
        const successElement = document.getElementById('register-success');
        
        if (!username || !email || !pin || !pinConfirm || !registerBtn) {
            console.error('Register form elements not found');
            return;
        }
        
        const usernameValue = username.value.trim();
        const emailValue = email.value.trim();
        const pinValue = pin.value;
        const pinConfirmValue = pinConfirm.value;
        
        // Validation
        if (!usernameValue || !emailValue || !pinValue || !pinConfirmValue) {
            showError(errorElement, t('error') + ': Please fill in all fields');
            return;
        }
        
        // Username validation
        if (usernameValue.length < 3) {
            showError(errorElement, t('error') + ': Username must be at least 3 characters');
            username.focus();
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue)) {
            showError(errorElement, t('error') + ': Please enter a valid email address');
            email.focus();
            return;
        }
        
        // PIN validation
        if (pinValue.length < 4) {
            showError(errorElement, t('error') + ': PIN must be at least 4 digits');
            pin.focus();
            return;
        }
        
        if (!/^\d+$/.test(pinValue)) {
            showError(errorElement, t('error') + ': PIN must contain only numbers');
            pin.focus();
            return;
        }
        
        if (pinValue !== pinConfirmValue) {
            showError(errorElement, t('error') + ': PINs do not match');
            pinConfirm.focus();
            return;
        }
        
        // Show loading state
        const btnText = registerBtn.querySelector('.btn-text');
        const btnLoader = registerBtn.querySelector('.btn-loader');
        const originalText = btnText ? btnText.textContent : t('create_account');
        
        if (btnText) btnText.textContent = 'Creating account...';
        if (btnLoader) btnLoader.style.display = 'inline-block';
        registerBtn.disabled = true;
        
        // Clear previous messages
        if (errorElement) errorElement.textContent = '';
        if (successElement) successElement.textContent = '';
        
        console.log('Attempting registration for:', usernameValue, emailValue);
        
        fetch('https://backend-production.up.railway.app/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: usernameValue,
                email: emailValue,
                pin: pinValue
            })
        })
        .then(response => {
            console.log('Register response status:', response.status);
            
            if (response.status === 201) {
                return response.json();
            } else if (response.status === 409) {
                throw new Error('Username or email already exists');
            } else if (response.status === 400) {
                throw new Error('Invalid data provided');
            } else {
                throw new Error('Registration failed. Please try again.');
            }
        })
        .then(data => {
            console.log('Registration successful:', data);
            
            // Show success message
            if (successElement) {
                successElement.textContent = t('success') + ': Registration successful! You can now sign in.';
                successElement.style.display = 'block';
            }
            
            // Clear form
            registerForm.reset();
            
            // Switch to login form after a delay
            setTimeout(() => {
                showLoginForm();
                
                // Pre-fill login form
                const loginUsername = document.getElementById('login-username');
                if (loginUsername) {
                    loginUsername.value = usernameValue;
                }
            }, 2000);
        })
        .catch(error => {
            console.error('Registration error:', error);
            showError(errorElement, error.message);
        })
        .finally(() => {
            // Reset button state
            if (btnText) btnText.textContent = originalText;
            if (btnLoader) btnLoader.style.display = 'none';
            registerBtn.disabled = false;
        });
    });
}

function showError(element, message) {
    if (!element) return;
    
    element.textContent = message;
    element.style.color = '#ef4444';
    element.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function clearMessages() {
    const errorElements = document.querySelectorAll('.error-message');
    const successElements = document.querySelectorAll('.success-message');
    
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    
    successElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}
fetch("https://backend-production.up.railway.app/api")
  .then(res => res.json())
  .then(data => console.log(data));