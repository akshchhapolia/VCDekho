document.addEventListener('DOMContentLoaded', () => {
    // Select elements
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('navigation-bar');
    const heroShowcase = document.getElementById('main-viewport');
    const waitlistBg = document.getElementById('waitlist-ambient-bg');

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

    // 2. FAQ Accordion Interaction
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const isOpen = faqItem.classList.contains('open');
            
            // Close all FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('open');
            });
            
            // If it wasn't open, open it
            if (!isOpen) {
                faqItem.classList.add('open');
            }
        });
    });

    // 3. Premium Parallax Hover Effect on Ambient Background
    if (heroShowcase && waitlistBg) {
        const handleMove = (clientX, clientY) => {
            const { width, height } = heroShowcase.getBoundingClientRect();
            // Offset calculations based on the main viewport element
            const rect = heroShowcase.getBoundingClientRect();
            const x = (clientX - rect.left) / width - 0.5;
            const y = (clientY - rect.top) / height - 0.5;

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
});
