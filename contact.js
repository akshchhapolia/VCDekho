document.addEventListener('DOMContentLoaded', () => {
    // Supabase credentials configuration
    const SUPABASE_URL = "https://qviyhvnubhduyhgwzuzc.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_8oN7IM2mUNSe8Q7WbaV2lw_86x1NPzb";
    
    // Select elements
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('navigation-bar');
    const heroShowcase = document.getElementById('main-viewport');
    const waitlistBg = document.getElementById('waitlist-ambient-bg');
    const contactForm = document.getElementById('contact-submission-form');
    const successContainer = document.getElementById('contact-success-container');

    // 1. Mobile Navigation Toggle
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            mainNav.classList.toggle('active');
        });

        // Close navigation menu if a link is clicked
        const navLinks = mainNav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                mainNav.classList.remove('active');
            });
        });
    }

    // 2. Premium Parallax Hover & Touch Effect on Ambient Background
    if (heroShowcase && waitlistBg) {
        const handleMove = (clientX, clientY) => {
            const { width, height } = heroShowcase.getBoundingClientRect();
            const x = (clientX - heroShowcase.offsetLeft) / width - 0.5;
            const y = (clientY - heroShowcase.offsetTop) / height - 0.5;

            // Subtle slide of the background container
            const bgMoveX = x * 35;
            const bgMoveY = y * 35;
            
            const transformStr = `scale(1.06) translate(${bgMoveX}px, ${bgMoveY}px)`;
            waitlistBg.style.transform = transformStr;
        };

        heroShowcase.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        heroShowcase.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        const handleReset = () => {
            const resetStr = 'scale(1) translate(0, 0)';
            waitlistBg.style.transform = resetStr;
        };

        heroShowcase.addEventListener('mouseleave', handleReset);
        heroShowcase.addEventListener('touchend', handleReset);
    }

    // 3. Form Validation and Submission
    if (contactForm) {
        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const messageInput = document.getElementById('contact-message');

        // Helper to show/hide error
        const setFieldError = (inputElement, errorElement, isError) => {
            if (isError) {
                inputElement.classList.add('invalid');
                if (errorElement) errorElement.style.display = 'block';
            } else {
                inputElement.classList.remove('invalid');
                if (errorElement) errorElement.style.display = 'none';
            }
        };

        // Live error clearing
        const setupLiveClearing = (inputElement, errorElement, validationFn) => {
            inputElement.addEventListener('input', () => {
                if (validationFn ? validationFn() : inputElement.value.trim() !== '') {
                    setFieldError(inputElement, errorElement, false);
                }
            });
        };

        setupLiveClearing(nameInput, document.getElementById('contact-name-error'));
        setupLiveClearing(emailInput, document.getElementById('contact-email-error'), () => {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailPattern.test(emailInput.value.trim());
        });
        setupLiveClearing(messageInput, document.getElementById('contact-message-error'));

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isFormValid = true;

            // Name validation
            if (nameInput.value.trim() === '') {
                setFieldError(nameInput, document.getElementById('contact-name-error'), true);
                isFormValid = false;
            } else {
                setFieldError(nameInput, document.getElementById('contact-name-error'), false);
            }

            // Email validation
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailInput.value.trim())) {
                setFieldError(emailInput, document.getElementById('contact-email-error'), true);
                isFormValid = false;
            } else {
                setFieldError(emailInput, document.getElementById('contact-email-error'), false);
            }

            // Message validation
            if (messageInput.value.trim() === '') {
                setFieldError(messageInput, document.getElementById('contact-message-error'), true);
                isFormValid = false;
            } else {
                setFieldError(messageInput, document.getElementById('contact-message-error'), false);
            }

            if (isFormValid) {
                const isSupabaseConfigured = SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

                if (isSupabaseConfigured) {
                    // Send message to Supabase REST API
                    fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            full_name: nameInput.value.trim(),
                            email: emailInput.value.trim(),
                            message: messageInput.value.trim(),
                            created_at: new Date().toISOString()
                        })
                    }).then(response => {
                        if (!response.ok) {
                            console.error('Supabase response error status:', response.status);
                        }
                    }).catch(err => {
                        console.error('Supabase submit request failed:', err);
                    });
                }

                // Submit success animation
                contactForm.style.transition = 'opacity 0.3s ease';
                contactForm.style.opacity = '0';
                
                setTimeout(() => {
                    contactForm.style.display = 'none';
                    if (successContainer) {
                        successContainer.style.display = 'flex';
                        successContainer.style.opacity = '0';
                        successContainer.style.transition = 'opacity 0.5s ease';
                        
                        // Reflow trigger
                        successContainer.offsetHeight;
                        successContainer.style.opacity = '1';
                    }
                }, 300);
            } else {
                // Focus on first invalid field
                const firstInvalid = contactForm.querySelector('.invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }
        });
    }
});
