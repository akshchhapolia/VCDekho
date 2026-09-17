document.addEventListener('DOMContentLoaded', () => {
    const heroShowcase = document.getElementById('main-viewport');
    const waitlistBg = document.getElementById('waitlist-ambient-bg');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 992px)').matches;
    const enableParallax = !prefersReducedMotion && !isMobile && heroShowcase && waitlistBg;

    if (enableParallax) {
        const handleMove = (clientX, clientY) => {
            const { width, height } = heroShowcase.getBoundingClientRect();
            const rect = heroShowcase.getBoundingClientRect();
            const x = (clientX - rect.left) / width - 0.5;
            const y = (clientY - rect.top) / height - 0.5;

            const bgMoveX = x * 35;
            const bgMoveY = y * 35;

            waitlistBg.style.transform = `scale(1.06) translate(${bgMoveX}px, ${bgMoveY}px)`;
        };

        heroShowcase.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        heroShowcase.addEventListener('mouseleave', () => {
            waitlistBg.style.transform = 'scale(1) translate(0, 0)';
        });
    }

    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const isOpen = faqItem.classList.contains('open');

            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('open');
            });

            if (!isOpen) {
                faqItem.classList.add('open');
            }
        });
    });
});
