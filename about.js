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
});
