document.addEventListener('DOMContentLoaded', () => {
    const heroShowcase = document.getElementById('main-viewport');
    const heroBg = document.getElementById('hero-background-media');
    const heroFallback = document.getElementById('hero-bg-fallback');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 992px)').matches;
    const enableParallax = !prefersReducedMotion && !isMobile;

    /** Abort hero media so the next navigation isn't starved of bandwidth (esp. mweb). */
    function releaseHeroMedia() {
        if (!heroBg) return;
        try {
            heroBg.pause();
        } catch (_) { /* ignore */ }
        try {
            heroBg.removeAttribute('src');
            heroBg.querySelectorAll('source').forEach(function (source) {
                source.removeAttribute('src');
                source.remove();
            });
            heroBg.load();
        } catch (_) { /* ignore */ }
        heroBg.style.display = 'none';
        if (heroFallback) heroFallback.style.display = 'block';
    }

    window.VCHero = { release: releaseHeroMedia };

    window.addEventListener('pagehide', releaseHeroMedia);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            try {
                if (heroBg) heroBg.pause();
            } catch (_) { /* ignore */ }
        }
    });

    if (heroBg && heroFallback) {
        // Mweb already shows the poster/fallback image — never fetch the mp4 there.
        const skipVideo = prefersReducedMotion || isMobile;

        if (skipVideo) {
            heroBg.style.display = 'none';
            heroFallback.style.display = 'block';
            releaseHeroMedia();
        } else {
            heroBg.setAttribute('playsinline', '');
            heroBg.setAttribute('webkit-playsinline', '');
            heroBg.muted = true;
            heroBg.playsInline = true;
            heroBg.preload = 'metadata';
            heroBg.style.display = '';
            heroFallback.style.display = 'none';

            const hideVideoHard = () => {
                heroBg.style.display = 'none';
                heroFallback.style.display = 'block';
            };

            const tryPlay = () => {
                heroBg.muted = true;
                return heroBg.play();
            };

            heroBg.addEventListener('error', hideVideoHard, { once: true });

            const startVideo = () => {
                if (document.visibilityState === 'hidden') return;
                if (!heroBg.querySelector('source') && !heroBg.getAttribute('src')) return;
                tryPlay().catch(hideVideoHard);
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

    // "Start Exploring" is a plain link. It used to preventDefault, animate, and
    // navigate from a 100ms timer, which threw away the browser's instant
    // navigation and its loading indicator, so taps felt dead on mobile. The
    // press state is handled by .trend-card-btn:active, and pagehide already
    // releases the hero media, so the native link needs no help.
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
