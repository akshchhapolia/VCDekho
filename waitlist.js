document.addEventListener('DOMContentLoaded', () => {
    // Supabase credentials configuration
    const SUPABASE_URL = "https://qviyhvnubhduyhgwzuzc.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_8oN7IM2mUNSe8Q7WbaV2lw_86x1NPzb";
    
    // Select elements
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('navigation-bar');
    const heroShowcase = document.getElementById('main-viewport');
    const waitlistBg = document.getElementById('waitlist-ambient-bg');
    const waitlistForm = document.getElementById('waitlist-registration-form');
    const successContainer = document.getElementById('waitlist-success-container');
    const tickerCounter = document.getElementById('ticker-counter-value');

    let liveCount = 247; // Base count

    // Fetch live waitlist count from Supabase on page load
    const fetchLiveCount = async () => {
        const isSupabaseConfigured = SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";
        if (!isSupabaseConfigured) return;

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id`, {
                method: 'HEAD',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'count=exact'
                }
            });
            if (response.ok) {
                const contentRange = response.headers.get('content-range');
                if (contentRange) {
                    const total = parseInt(contentRange.split('/')[1], 10);
                    if (!isNaN(total)) {
                        liveCount = 247 + total;
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch live waitlist count:', err);
        }
    };
    
    fetchLiveCount();

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
    if (waitlistForm) {
        const nameInput = document.getElementById('full-name');
        const emailInput = document.getElementById('work-email');
        const startupNameInput = document.getElementById('startup-name');
        const websiteInput = document.getElementById('startup-website');
        const stageSelect = document.getElementById('startup-stage');
        const amountSelect = document.getElementById('fundraise-amount');
        const lookingCheckboxes = document.querySelectorAll('input[name="lookingFor"]');
        const checkboxGroup = document.querySelector('.checkbox-group-container');

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
            const clearEvent = inputElement.tagName === 'SELECT' ? 'change' : 'input';
            inputElement.addEventListener(clearEvent, () => {
                if (validationFn ? validationFn() : inputElement.value.trim() !== '') {
                    setFieldError(inputElement, errorElement, false);
                }
            });
        };

        setupLiveClearing(nameInput, document.getElementById('name-error'));
        setupLiveClearing(emailInput, document.getElementById('email-error'), () => {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailPattern.test(emailInput.value.trim());
        });
        setupLiveClearing(startupNameInput, document.getElementById('startup-name-error'));
        setupLiveClearing(websiteInput, document.getElementById('website-error'), () => {
            const val = websiteInput.value.trim();
            if (val === '') return true;
            const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
            return urlPattern.test(val);
        });
        setupLiveClearing(stageSelect, document.getElementById('stage-error'));
        setupLiveClearing(amountSelect, document.getElementById('amount-error'));

        // Checkbox live clearing
        lookingCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const anyChecked = Array.from(lookingCheckboxes).some(cb => cb.checked);
                if (anyChecked) {
                    const errorEl = document.getElementById('looking-error');
                    if (errorEl) errorEl.style.display = 'none';
                    checkboxGroup.classList.remove('invalid');
                }
            });
        });

        waitlistForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isFormValid = true;

            // Name validation
            if (nameInput.value.trim() === '') {
                setFieldError(nameInput, document.getElementById('name-error'), true);
                isFormValid = false;
            } else {
                setFieldError(nameInput, document.getElementById('name-error'), false);
            }

            // Email validation
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailInput.value.trim())) {
                setFieldError(emailInput, document.getElementById('email-error'), true);
                isFormValid = false;
            } else {
                setFieldError(emailInput, document.getElementById('email-error'), false);
            }

            // Startup Name validation
            if (startupNameInput.value.trim() === '') {
                setFieldError(startupNameInput, document.getElementById('startup-name-error'), true);
                isFormValid = false;
            } else {
                setFieldError(startupNameInput, document.getElementById('startup-name-error'), false);
            }

            // Startup Website validation (Optional, but regex check if filled)
            const webVal = websiteInput.value.trim();
            if (webVal !== '') {
                const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
                if (!urlPattern.test(webVal)) {
                    setFieldError(websiteInput, document.getElementById('website-error'), true);
                    isFormValid = false;
                } else {
                    setFieldError(websiteInput, document.getElementById('website-error'), false);
                }
            } else {
                setFieldError(websiteInput, document.getElementById('website-error'), false);
            }

            // Stage validation
            if (stageSelect.value === '') {
                setFieldError(stageSelect, document.getElementById('stage-error'), true);
                isFormValid = false;
            } else {
                setFieldError(stageSelect, document.getElementById('stage-error'), false);
            }

            // Checkbox validation
            const anyChecked = Array.from(lookingCheckboxes).some(cb => cb.checked);
            if (!anyChecked) {
                const errorEl = document.getElementById('looking-error');
                if (errorEl) errorEl.style.display = 'block';
                checkboxGroup.classList.add('invalid');
                isFormValid = false;
            } else {
                const errorEl = document.getElementById('looking-error');
                if (errorEl) errorEl.style.display = 'none';
                checkboxGroup.classList.remove('invalid');
            }

            // Amount validation
            if (amountSelect.value === '') {
                setFieldError(amountSelect, document.getElementById('amount-error'), true);
                isFormValid = false;
            } else {
                setFieldError(amountSelect, document.getElementById('amount-error'), false);
            }

            if (isFormValid) {
                const isSupabaseConfigured = SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

                if (isSupabaseConfigured) {
                    const lookingForValues = Array.from(lookingCheckboxes)
                        .filter(cb => cb.checked)
                        .map(cb => cb.value);

                    // Send waitlist signup to Supabase REST API
                    fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            full_name: nameInput.value.trim(),
                            work_email: emailInput.value.trim(),
                            startup_name: startupNameInput.value.trim(),
                            startup_website: websiteInput.value.trim() || null,
                            startup_stage: stageSelect.value,
                            looking_for: lookingForValues.join(', '),
                            fundraise_amount: amountSelect.value,
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

                // Increment count for current user
                liveCount++;

                // Submit success animation (always triggers to keep UX smooth)
                waitlistForm.style.transition = 'opacity 0.3s ease';
                waitlistForm.style.opacity = '0';
                
                setTimeout(() => {
                    waitlistForm.style.display = 'none';
                    if (successContainer) {
                        successContainer.style.display = 'flex';
                        successContainer.style.opacity = '0';
                        successContainer.style.transition = 'opacity 0.5s ease';
                        
                        // Reflow trigger
                        successContainer.offsetHeight;
                        successContainer.style.opacity = '1';
                        
                        // Start ticker counter animation (Count from liveCount - 17 to liveCount)
                        const startCount = liveCount - 17;
                        animateTicker(startCount, liveCount, 600);
                    }
                }, 300);
            } else {
                // Focus on first invalid field
                const firstInvalid = waitlistForm.querySelector('.invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }
        });
    }

    // Ticker animation helper
    function animateTicker(start, end, duration) {
        if (!tickerCounter) return;
        const range = end - start;
        let current = start;
        const increment = 1;
        const stepTime = Math.abs(Math.floor(duration / range));
        
        tickerCounter.textContent = start;
        
        const timer = setInterval(() => {
            current += increment;
            tickerCounter.textContent = current;
            if (current >= end) {
                tickerCounter.textContent = end;
                clearInterval(timer);
            }
        }, stepTime);
    }
});
