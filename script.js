gsap.registerPlugin(ScrollTrigger);

// Disable browser scroll restoration — we handle it manually below
if (history.scrollRestoration) history.scrollRestoration = 'manual';
ScrollTrigger.config({ ignoreMobileResize: true });

// Lenis smooth scroll + GSAP ScrollTrigger integration
const LENIS_PRESETS = {
    default: {},
    smoothTest: {
        lerp: 0.07,
        wheelMultiplier: 0.85,
        touchMultiplier: 0.95,
    },
};
const ACTIVE_LENIS_PRESET = 'smoothTest'; // set 'default' to revert
const lenis = new Lenis(LENIS_PRESETS[ACTIVE_LENIS_PRESET]);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Save scroll position before reload
window.addEventListener('pagehide', () => {
    sessionStorage.setItem('scrollY', window.scrollY);
});

// Entry animation: сначала header, потом title
const tl = gsap.timeline();

tl.from(".header", {
    duration: 0.8,
    opacity: 0,
    y: -30,
    ease: "power3.out"
})
.from(".hero-title-img", {
    duration: 1.2,
    opacity: 0,
    y: 70,
    ease: "power3.out"
}, "+=0.1");

// text_section: pin + последовательное появление блоков
gsap.set([".collection-title", ".collection-subtitle", ".collection-buttons"], {
    opacity: 0,
    y: 40
});

const textTl = gsap.timeline({
    scrollTrigger: {
        trigger: ".text_section",
        start: "top top",
        end: "+=900",
        pin: true,
        scrub: 1,
    }
});

textTl
    .to(".collection-title", { opacity: 1, y: 0, duration: 1, ease: "power2.out" })
    .to(".collection-subtitle", { opacity: 1, y: 0, duration: 1, ease: "power2.out" }, "+=0.4")
    .to(".collection-buttons", { opacity: 1, y: 0, duration: 1, ease: "power2.out" }, "+=0.4");

// cards_section: pin + конвейер снизу вверх насквозь
gsap.set(".cards_section .info_card", { y: "110vh" });

const cardsTl = gsap.timeline({
    scrollTrigger: {
        trigger: ".cards_section",
        start: "top top",
        end: "+=3800",
        pin: true,
        scrub: 1,
    }
});

cardsTl
    .to(".cards_section .info_card:nth-child(1)", { y: "-110vh", duration: 2, ease: "none" })
    .to(".cards_section .info_card:nth-child(2)", { y: "-110vh", duration: 2, ease: "none" }, "-=1.4")
    .to(".cards_section .info_card:nth-child(3)", { y: "-110vh", duration: 2, ease: "none" }, "-=1.4");

// title_location: появление слов в случайном порядке
(function () {
    const el = document.querySelector(".title_location");
    // Разбиваем HTML на части сохраняя <br> теги
    const parts = el.innerHTML.split(/(<br\s*\/?>)/gi);
    el.innerHTML = parts.map(part =>
        /<br\s*\/?>/.test(part)
            ? part
            : part.trim().split(/\s+/).filter(Boolean).map(w =>
                `<span class="tl-word" style="display:inline-block">${w}</span>`
            ).join(" ")
    ).join("");

    gsap.set(".tl-word", { opacity: 0, y: 20 });
    gsap.set(".desc_location", { opacity: 0, y: 20 });

    const words = Array.from(document.querySelectorAll(".tl-word"));
    const shuffled = words.sort(() => Math.random() - 0.5);

    ScrollTrigger.create({
        trigger: ".location_section",
        start: "top center",
        once: true,
        onEnter: () => {
            gsap.to(shuffled, {
                opacity: 1,
                y: 0,
                duration: 0.5,
                stagger: 0.07,
                ease: "power2.out",
                delay: 0.2
            });
            gsap.to(".desc_location", {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                delay: 1
            });
        }
    });
})();

// exterior section: анимация карточек NEXT / BACK
(function () {
    const slides = Array.from(document.querySelectorAll('.ext-slide'));
    const stack = document.querySelector('.exterior-stack');
    const counter = document.querySelector('.exterior-counter');
    const btnNext = document.querySelector('.ext-next');
    const btnBack = document.querySelector('.ext-back');
    const exteriorSection = stack ? stack.closest('.exterior_section') : null;
    if (!slides.length || !counter || !btnNext || !btnBack || !exteriorSection) return;

    slides.forEach((img) => {
        if (img.decode) img.decode().catch(() => {});
    });

    const total = slides.length;
    let order = slides.map((_, i) => i);
    let isAnimating = false;
    let introDone = false;

    const positions = [
        { bottom: 0,  scaleX: 1,    brightness: 1,    zIndex: 5, opacity: 1    },
        { bottom: 15, scaleX: 0.87, brightness: 0.65, zIndex: 4, opacity: 0.55 },
        { bottom: 30, scaleX: 0.79, brightness: 0.45, zIndex: 3, opacity: 0.35 },
        { bottom: 45, scaleX: 0.72, brightness: 0.30, zIndex: 2, opacity: 0.15 },
        { bottom: 60, scaleX: 0.66, brightness: 0.18, zIndex: 1, opacity: 0.05  },
    ];

    function applyPos(el, depth, animate = true, dur = 0.4) {
        const p = positions[depth];
        const props = { bottom: p.bottom, scaleX: p.scaleX, filter: `brightness(${p.brightness})`, zIndex: p.zIndex, opacity: p.opacity };
        animate ? gsap.to(el, { ...props, duration: dur, ease: 'power2.inOut' })
                : gsap.set(el, props);
    }

    order.forEach((idx, depth) => {
        applyPos(slides[idx], depth, false);
    });
    gsap.set(slides, { opacity: 0, y: 42, force3D: true });

    function updateCounter() {
        const n = String(order[0] + 1).padStart(2, '0');
        counter.textContent = `${n} / ${String(total).padStart(2, '0')}`;
    }

    // NEXT: фронтальная карточка исчезает, следующая выдвигается вперёд (счётчик растёт)
    function goNext() {
        if (isAnimating || !introDone) return;
        isAnimating = true;

        const frontEl = slides[order[0]];

        // Карточки позади (1–4) выдвигаются вперёд
        order.slice(1).forEach((idx, i) => applyPos(slides[idx], i, true, 0.5));

        // Фронтальная исчезает
        gsap.to(frontEl, {
            opacity: 0,
            duration: 0.4,
            ease: 'power2.in',
            onComplete: () => {
                order.push(order.shift());
                const p = positions[total - 1];
                gsap.set(frontEl, { bottom: p.bottom, scaleX: p.scaleX, filter: `brightness(${p.brightness})`, zIndex: p.zIndex, opacity: p.opacity });
                updateCounter();
                isAnimating = false;
            }
        });
    }

    // BACK: последняя карточка появляется спереди через opacity (счётчик убывает)
    function goBack() {
        if (isAnimating || !introDone) return;
        isAnimating = true;

        // Последняя карточка становится новым фронтом
        order.unshift(order.pop());
        const newFront = slides[order[0]];

        // Ставим новую карточку спереди, невидимой
        applyPos(newFront, 0, false);
        gsap.set(newFront, { opacity: 0, zIndex: 6 });

        // Остальные уходят назад на одну позицию
        order.slice(1).forEach((idx, i) => applyPos(slides[idx], i + 1, true, 0.5));

        // Появление через opacity
        gsap.to(newFront, {
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => {
                gsap.set(newFront, { zIndex: positions[0].zIndex });
                updateCounter();
                isAnimating = false;
            }
        });
    }

    ScrollTrigger.create({
        trigger: stack,
        start: 'center 65%',
        once: true,
        onEnter: () => {
            const introTl = gsap.timeline({
                onComplete: () => { introDone = true; },
            });

            const reversedOrder = order.slice().reverse();
            introTl.to({}, { duration: 0.1, ease: 'none' });

            reversedOrder.forEach((idx, i) => {
                const depth = total - 1 - i;
                introTl.to(slides[idx], {
                    y: 0,
                    opacity: positions[depth].opacity,
                    duration: 0.68,
                    ease: 'power4.out',
                    force3D: true,
                    overwrite: 'auto',
                }, i * 0.08);
            });
        },
    });

    btnNext.addEventListener('click', goNext);
    btnBack.addEventListener('click', goBack);
    updateCounter();
})();

// interior_section: stacked cards scroll animation
(function () {
    const interiorSection = document.querySelector('.interior_section');
    const cards = Array.from(document.querySelectorAll('.interior_card'));
    if (!interiorSection || !cards.length) return;
    if (window.innerWidth <= 767) return;

    const SCALE_STEP = 0.04;
    const Y_STEP = 38;
    const CSS_TOP = 70;
    const FADE_REF = CSS_TOP - Y_STEP;

    const N = cards.length;
    const setInteriorHeight = () => {
        interiorSection.style.height = `${N * window.innerHeight}px`;
    };
    setInteriorHeight();
    ScrollTrigger.addEventListener('refreshInit', setInteriorHeight);

    cards.forEach(card => {
        const img = card.querySelector('img');
        if (img && img.decode) img.decode().catch(() => {});
    });

    // z-index: later card = higher z (rises on top of current)
    cards.forEach((card, i) => {
        gsap.set(card, {
            zIndex: i + 1,
            y: i === 0 ? 0 : window.innerHeight,
            force3D: true,
        });
    });

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: interiorSection,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            invalidateOnRefresh: true,
        }
    });

    for (let i = 0; i < N - 1; i++) {
        // incoming card rises from below
        tl.to(cards[i + 1], { y: 0, ease: 'none', duration: 1, force3D: true }, i);

        // every card before it recedes one depth level further
        for (let j = 0; j <= i; j++) {
            const depth       = i - j + 1;
            const renderedTop = CSS_TOP - depth * Y_STEP;
            const opacity     = Math.max(0, Math.min(1, renderedTop / FADE_REF));
            tl.to(cards[j], {
                scale:   1 - depth * SCALE_STEP,
                y:      -(depth * Y_STEP),
                opacity,
                ease: 'none',
                duration: 1,
                force3D: true,
            }, i);
        }
    }
})();

// sea-section: pin + text reveal + image scale to ~95% viewport, then unpin
(function () {
    const seaSection = document.querySelector('.sea-section');
    const seaImage = document.querySelector('.sea-image');
    const seaText = document.querySelectorAll('.sea-text');
    const seaPanoramicBtn = document.querySelector('.sea-panoramic-btn');

    if (!seaSection || !seaImage || !seaText.length) return;
    const SEA_SCROLL_DISTANCE = 2000;
    const setSeaHeight = () => {
        seaSection.style.height = `${window.innerHeight + SEA_SCROLL_DISTANCE}px`;
    };
    setSeaHeight();
    ScrollTrigger.addEventListener('refreshInit', setSeaHeight);

    gsap.set(seaText, { y: '110%', opacity: 0 });
    gsap.set(seaImage, { opacity: 1 });
    if (seaPanoramicBtn) gsap.set(seaPanoramicBtn, { opacity: 0 });

    let introPlayed = false;

    const playIntroOnce = () => {
        if (introPlayed) return;
        introPlayed = true;

        gsap.timeline()
            .to(seaText, {
                y: 0,
                opacity: 1,
                duration: 0.65,
                ease: 'power3.out',
                stagger: 0.08,
            }, '+=0.02');
    };

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: seaSection,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            invalidateOnRefresh: true,
            onEnter: () => requestAnimationFrame(playIntroOnce),
            onEnterBack: () => requestAnimationFrame(playIntroOnce),
        },
    });

    tl.to({}, { duration: 0.35, ease: 'none' })
      .to(seaImage, {
          width: '95vw',
          height: '95vh',
          duration: 0.65,
          ease: 'none',
      });

    if (seaPanoramicBtn) {
        tl.to({}, { duration: 0.08, ease: 'none' })
          .to(seaPanoramicBtn, {
              opacity: 1,
              duration: 0.12,
              ease: 'none',
          })
          .to({}, { duration: 0.5, ease: 'none' });
    }
})();

// Panoramic modal
(function () {
    const modal = document.getElementById('panoramicModal');
    const btn = document.querySelector('.sea-panoramic-btn');
    const overlay = modal && modal.querySelector('.panoramic-modal__overlay');
    const closeBtn = modal && modal.querySelector('.panoramic-modal__close');
    const iframe = modal && modal.querySelector('.panoramic-modal__iframe');

    if (!modal || !btn) return;

    const openModal = (e) => {
        e.preventDefault();
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
        // Останавливаем видео/аудио в iframe сбросом src
        if (iframe) { const s = iframe.src; iframe.src = ''; iframe.src = s; }
    };

    btn.addEventListener('click', openModal);
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
})();

// Scroll shrink: уменьшает title до 150px по высоте при скролле
window.addEventListener("load", () => {
    const img = document.querySelector(".hero-title-img");
    if (!img || window.innerWidth <= 767) return;

    const initialHeight = img.offsetHeight;

    gsap.to(img, {
        scale: 150 / initialHeight,
        y: 100,
        transformOrigin: "center center",
        ease: "none",
        scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "+=300",
            scrub: 1,
        }
    });
});

// floorplan accordion: click row to toggle plan card panel
(function () {
    const items = Array.from(document.querySelectorAll('.floorplan-item'));

    document.querySelectorAll('.plan-card__image').forEach(img => {
        if (img.decode) img.decode().catch(() => {});
    });

    // All panels start collapsed
    items.forEach(item => {
        gsap.set(item.querySelector('.floorplan-panel'), { height: 0, overflow: 'hidden' });
    });

    let openItem = null;

    items.forEach(item => {
        const row    = item.querySelector('.floorplan-row');
        const panel  = item.querySelector('.floorplan-panel');
        const icon   = item.querySelector('.toggle-icon');

        row.addEventListener('click', () => {
            const isOpen = item === openItem;

            // Close currently open item
            if (openItem) {
                const closingItem = openItem;
                gsap.to(closingItem.querySelector('.floorplan-panel'), {
                    height: 0, duration: 0.4, ease: 'power2.inOut', overwrite: true,
                    onComplete: () => ScrollTrigger.refresh(),
                });
                closingItem.classList.remove('is-open');
                closingItem.querySelector('.toggle-icon').textContent = '˅';
                openItem = null;
            }

            // Open clicked item if it was closed
            if (!isOpen) {
                gsap.to(panel, {
                    height: 'auto', duration: 0.45, ease: 'power2.inOut', overwrite: true,
                    onComplete: () => ScrollTrigger.refresh(),
                });
                item.classList.add('is-open');
                icon.textContent = '˄';
                openItem = item;
            }
        });
    });
})();



// amenity section: pin + scroll through 4 slides
(function () {
    const tags    = Array.from(document.querySelectorAll('.amenity-tag'));
    const track   = document.querySelector('.amenity-track');
    const counter = document.querySelector('.amenity-counter');
    const N       = tags.length; // 4

    // Pre-decode images
    document.querySelectorAll('.amenity-img').forEach(img => {
        if (img.decode) img.decode().catch(() => {});
    });

    let currentStep = -1;

    function goToStep(step, animate) {
        if (step === currentStep) return;
        currentStep = step;

        // Counter
        counter.textContent =
            String(step + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');

        // Tags: toggle .active class — CSS transition handles the rest
        tags.forEach((tag, i) => tag.classList.toggle('active', i === step));

        // Slide track
        gsap.to(track, {
            x: -(step * 100) + '%',
            duration: animate ? 0.65 : 0,
            ease: 'power2.inOut',
            overwrite: true,
        });
    }

    // Set initial state without animation
    goToStep(0, false);

    ScrollTrigger.create({
        trigger: '.amenity',
        start: 'top top',
        end: () => `+=${(N - 1) * window.innerHeight}`,
        pin: true,
        snap: {
            snapTo: 1 / (N - 1),
            duration: { min: 0.2, max: 0.5 },
            ease: 'power2.inOut',
        },
        onUpdate: self => {
            const step = Math.min(N - 1, Math.round(self.progress * (N - 1)));
            goToStep(step, true);
        },
    });
})();

// video-hero: masked text reveal from bottom (explicit left/right/center targets)
(function () {
    const allBlocks = Array.from(
        document.querySelectorAll(
            '.video-hero .text-block.left, .video-hero .text-block.right, .video-hero .text-block.center'
        )
    );

    if (!allBlocks.length) return;

    gsap.set(allBlocks, {
        clipPath: 'inset(100% 0% 0% 0%)',
        y: 34,
        opacity: 0,
    });

    allBlocks.forEach((block) => {
        gsap.to(block, {
            clipPath: 'inset(0% 0% 0% 0%)',
            y: 0,
            opacity: 1,
            duration: 1.35,
            ease: 'power4.out',
            scrollTrigger: {
                trigger: block,
                start: 'top 78%',
                toggleActions: 'play none none reverse',
            },
        });
    });
})();

// contact modal: open from header, close on overlay/button/escape
(function () {
    const openBtn = document.querySelector('.header-contact');
    const modal = document.querySelector('#contact-modal');
    if (!openBtn || !modal) return;

    const closeTargets = modal.querySelectorAll('[data-contact-close]');
    const form = modal.querySelector('form');

    function openModal() {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('contact-open');
        if (typeof lenis !== 'undefined' && lenis?.stop) lenis.stop();
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('contact-open');
        if (typeof lenis !== 'undefined' && lenis?.start) lenis.start();
    }

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });

    closeTargets.forEach((el) => {
        el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            closeModal();
        });
    }
})();

// interior mobile: dedicated stacked cards animation
(function () {
    const section = document.querySelector('.interior-mobile');
    const sticky = document.querySelector('.interior-mobile-sticky');
    const cards = Array.from(document.querySelectorAll('.interior-mobile-card'));
    if (!section || !sticky || !cards.length) return;
    if (window.innerWidth > 767) return;

    const N = cards.length;
    const CARD_ENTER_Y = window.innerHeight * 0.84;
    const STEP_DISTANCE = window.innerHeight * 1.08;
    const SCALE_STEP = 0.045;
    const Y_STEP = 16;

    const setSectionHeight = () => {
        section.style.height = `${window.innerHeight + ((N - 1) * STEP_DISTANCE) + window.innerHeight * 0.45}px`;
    };
    setSectionHeight();
    ScrollTrigger.addEventListener('refreshInit', setSectionHeight);

    cards.forEach((card) => {
        const img = card.querySelector('img');
        if (img && img.decode) img.decode().catch(() => {});
    });

    cards.forEach((card, i) => {
        gsap.set(card, {
            zIndex: i + 1,
            xPercent: -50,
            yPercent: -50,
            y: i === 0 ? 0 : CARD_ENTER_Y,
            scale: 1,
            opacity: 1,
            force3D: true,
        });
    });

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            invalidateOnRefresh: true,
        }
    });

    for (let i = 0; i < N - 1; i++) {
        tl.to(cards[i + 1], {
            y: 0,
            ease: 'none',
            duration: 1,
            force3D: true,
        }, i);

        for (let j = 0; j <= i; j++) {
            const depth = i - j + 1;
            tl.to(cards[j], {
                scale: 1 - depth * SCALE_STEP,
                y: -(depth * Y_STEP),
                opacity: Math.max(0.18, 1 - depth * 0.18),
                ease: 'none',
                duration: 1,
                force3D: true,
            }, i);
        }
    }
})();

// static bottom contact block: keep form non-submitting until backend is connected
(function () {
    const forms = document.querySelectorAll('.contact-block .contact-modal__form');
    forms.forEach((form) => {
        form.addEventListener('submit', (e) => e.preventDefault());
    });
})();

// Restore scroll position after GSAP has recalculated all pin spacers
(function () {
    const savedY = sessionStorage.getItem('scrollY');
    if (!savedY) return;
    sessionStorage.removeItem('scrollY');

    // refresh() synchronously recalculates pin spacers,
    // then scrollTo restores exact position via Lenis (window.scrollTo conflicts with Lenis)
    ScrollTrigger.refresh();
    lenis.scrollTo(+savedY, { immediate: true });
})();
