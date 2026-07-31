document.addEventListener('DOMContentLoaded', () => {
    const heroShowcase = document.getElementById('main-viewport');
    const heroBg = document.getElementById('hero-background-media');
    const heroFallback = document.getElementById('hero-bg-fallback');
    const exploreBtn = document.getElementById('explore-btn');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 992px)').matches;
    const enableParallax = !prefersReducedMotion && !isMobile;

    if (heroBg && heroFallback) {
        if (prefersReducedMotion || isMobile) {
            heroBg.style.display = 'none';
            heroFallback.style.display = 'block';
        } else {
            const startVideo = () => {
                heroBg.play().catch(() => {
                    heroBg.style.display = 'none';
                    heroFallback.style.display = 'block';
                });
            };
            if ('requestIdleCallback' in window) {
                requestIdleCallback(startVideo, { timeout: 2000 });
            } else {
                setTimeout(startVideo, 150);
            }
        }
    }

    if (enableParallax && heroShowcase && heroBg) {
        const handleMove = (clientX, clientY) => {
            const { width, height } = heroShowcase.getBoundingClientRect();
            const x = (clientX - heroShowcase.offsetLeft) / width - 0.5;
            const y = (clientY - heroShowcase.offsetTop) / height - 0.5;

            const bgMoveX = x * 25;
            const bgMoveY = y * 25;

            const transformStr = `scale(1.05) translate(${bgMoveX}px, ${bgMoveY}px)`;
            heroBg.style.transform = transformStr;
            if (heroFallback) {
                heroFallback.style.transform = transformStr;
            }
        };

        heroShowcase.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        const handleReset = () => {
            const resetStr = 'scale(1) translate(0, 0)';
            heroBg.style.transform = resetStr;
            if (heroFallback) {
                heroFallback.style.transform = resetStr;
            }
        };

        heroShowcase.addEventListener('mouseleave', handleReset);
    }

    if (exploreBtn) {
        exploreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exploreBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                exploreBtn.style.transform = 'scale(1)';
                window.location.href = exploreBtn.getAttribute('href');
            }, 100);
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.closest('.faq-item');

            document.querySelectorAll('.faq-item.open').forEach(item => {
                if (item !== faqItem) {
                    item.classList.remove('open');
                }
            });

            faqItem.classList.toggle('open');
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('reading-progress');
    if (progressBar) {
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (height > 0) {
                const scrolled = (winScroll / height) * 100;
                progressBar.style.width = scrolled + '%';
            }
        });
    }
});
