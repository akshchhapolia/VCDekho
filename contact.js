document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = "https://qviyhvnubhduyhgwzuzc.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_8oN7IM2mUNSe8Q7WbaV2lw_86x1NPzb";

    const heroShowcase = document.getElementById('main-viewport');
    const waitlistBg = document.getElementById('waitlist-ambient-bg');
    const contactForm = document.getElementById('contact-submission-form');
    const successContainer = document.getElementById('contact-success-container');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 992px)').matches;
    const enableParallax = !prefersReducedMotion && !isMobile && heroShowcase && waitlistBg;

    if (enableParallax) {
        const handleMove = (clientX, clientY) => {
            const { width, height } = heroShowcase.getBoundingClientRect();
            const x = (clientX - heroShowcase.offsetLeft) / width - 0.5;
            const y = (clientY - heroShowcase.offsetTop) / height - 0.5;
            waitlistBg.style.transform = `scale(1.06) translate(${x * 35}px, ${y * 35}px)`;
        };

        heroShowcase.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        heroShowcase.addEventListener('mouseleave', () => {
            waitlistBg.style.transform = 'scale(1) translate(0, 0)';
        });
    }

    if (contactForm) {
        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const messageInput = document.getElementById('contact-message');

        const setFieldError = (inputElement, errorElement, isError) => {
            if (isError) {
                inputElement.classList.add('invalid');
                if (errorElement) errorElement.style.display = 'block';
            } else {
                inputElement.classList.remove('invalid');
                if (errorElement) errorElement.style.display = 'none';
            }
        };

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

            if (nameInput.value.trim() === '') {
                setFieldError(nameInput, document.getElementById('contact-name-error'), true);
                isFormValid = false;
            } else {
                setFieldError(nameInput, document.getElementById('contact-name-error'), false);
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailInput.value.trim())) {
                setFieldError(emailInput, document.getElementById('contact-email-error'), true);
                isFormValid = false;
            } else {
                setFieldError(emailInput, document.getElementById('contact-email-error'), false);
            }

            if (messageInput.value.trim() === '') {
                setFieldError(messageInput, document.getElementById('contact-message-error'), true);
                isFormValid = false;
            } else {
                setFieldError(messageInput, document.getElementById('contact-message-error'), false);
            }

            if (isFormValid) {
                if (window.VCAnalytics) window.VCAnalytics.track('contact_submit');
                const isSupabaseConfigured = SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

                if (isSupabaseConfigured) {
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

                contactForm.style.transition = 'opacity 0.3s ease';
                contactForm.style.opacity = '0';

                setTimeout(() => {
                    contactForm.style.display = 'none';
                    if (successContainer) {
                        successContainer.style.display = 'flex';
                        successContainer.style.opacity = '0';
                        successContainer.style.transition = 'opacity 0.5s ease';
                        successContainer.offsetHeight;
                        successContainer.style.opacity = '1';
                    }
                }, 300);
            } else {
                const firstInvalid = contactForm.querySelector('.invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }
        });
    }
});
