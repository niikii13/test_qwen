// Mobile Navigation Toggle
const burger = document.querySelector('.burger');
const navMenu = document.querySelector('.nav-menu');

burger.addEventListener('click', () => {
    burger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        burger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Phone Mask Function
function initPhoneMask(input) {
    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        
        if (value.length === 0) {
            e.target.value = '';
            return;
        }
        
        if (value[0] === '7' || value[0] === '8') {
            value = value.substring(1);
        }
        
        let formattedValue = '+7';
        
        if (value.length > 0) {
            formattedValue += '(' + value.substring(0, 3);
        }
        if (value.length >= 3) {
            formattedValue += ')-' + value.substring(3, 6);
        }
        if (value.length >= 6) {
            formattedValue += '-' + value.substring(6, 8);
        }
        if (value.length >= 8) {
            formattedValue += '-' + value.substring(8, 10);
        }
        
        e.target.value = formattedValue;
    });
    
    input.addEventListener('focus', function() {
        if (!this.value) {
            this.value = '+7(';
        }
    });
    
    input.addEventListener('blur', function() {
        if (this.value === '+7(') {
            this.value = '';
        }
    });
}

// Initialize phone masks
const phoneInputs = document.querySelectorAll('input[type="tel"]');
phoneInputs.forEach(input => {
    initPhoneMask(input);
});

// Modal Functionality
const modal = document.getElementById('modal');
const modalClose = document.querySelector('.modal-close');
const modalProduct = document.getElementById('modalProduct');
const modalForm = document.getElementById('modalForm');
const orderButtons = document.querySelectorAll('.btn-order');

// Open modal when clicking order button
orderButtons.forEach(button => {
    button.addEventListener('click', () => {
        const productName = button.getAttribute('data-product');
        modalProduct.textContent = `Модель: ${productName}`;
        modal.style.display = 'block';
        document.getElementById('modalName').focus();
    });
});

// Close modal
modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Show notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationText = notification.querySelector('.notification-text');
    notificationText.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Validate phone number
function validatePhone(phone) {
    const phoneRegex = /^\+7\(\d{3}\)-\d{3}-\d{2}-\d{2}$/;
    return phoneRegex.test(phone);
}

// Validate email
function validateEmail(email) {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Handle modal form submission
modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('modalName').value.trim();
    const phone = document.getElementById('modalPhone').value.trim();
    const email = document.getElementById('modalEmail').value.trim();
    
    // Validation
    if (name.length < 2) {
        alert('Пожалуйста, введите корректное имя (минимум 2 символа)');
        return;
    }
    
    if (!validatePhone(phone)) {
        alert('Пожалуйста, введите корректный номер телефона в формате +7(999)-999-99-99');
        return;
    }
    
    if (!validateEmail(email)) {
        alert('Пожалуйста, введите корректный email');
        return;
    }
    
    // Success
    showNotification('Успешная отправка формы!');
    modal.style.display = 'none';
    modalForm.reset();
});

// Handle contact form submission
const orderForm = document.getElementById('orderForm');
orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const inputs = orderForm.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (input.type === 'tel') {
            if (!validatePhone(input.value.trim())) {
                isValid = false;
                input.style.borderColor = '#e74c3c';
            } else {
                input.style.borderColor = '#ecf0f1';
            }
        } else if (input.type === 'text' && input.value.trim().length < 2) {
            isValid = false;
            input.style.borderColor = '#e74c3c';
        } else {
            input.style.borderColor = '#ecf0f1';
        }
    });
    
    if (!isValid) {
        alert('Пожалуйста, заполните все обязательные поля корректно');
        return;
    }
    
    // Check phone specifically
    const phoneInput = orderForm.querySelector('input[type="tel"]');
    if (!validatePhone(phoneInput.value.trim())) {
        alert('Пожалуйста, введите корректный номер телефона в формате +7(999)-999-99-99');
        return;
    }
    
    // Success
    showNotification('Успешная отправка формы!');
    orderForm.reset();
});

// Smooth scroll for older browsers
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.product-card, .feature-item, .review-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Header background change on scroll
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 50) {
        header.style.background = 'rgba(26, 37, 47, 0.98)';
    } else {
        header.style.background = 'rgba(44, 62, 80, 0.95)';
    }
});
