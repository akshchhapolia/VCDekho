document.addEventListener('DOMContentLoaded', () => {
    const heroShowcase = document.getElementById('main-viewport');
    const waitlistBg = document.getElementById('waitlist-ambient-bg');

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
});
