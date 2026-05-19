(() => {
    "use strict";

    // final-v6: 슬라이드 일시정지 + 로딩 최적화 + 라이트박스 설명 + 엔딩 완료 표시

    if (window.__memorySiteFinalScriptLoaded) return;
    window.__memorySiteFinalScriptLoaded = true;

    const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=900&auto=format&fit=crop&q=70";
    const SITE_THEMES = ["night", "cherry", "ocean", "letter"];
    const loveMessages = [
        "사랑해. 하은아.",
        "언제나 곁에 있어줘.",
        "우리의 이야기가 언제나 행복하기를.",
        "언제나 웃어줘, 그럼 나도 웃을테니.",
        "밤하늘의 별처럼 언제나 밝게 빛나기를.",
        "나에게 넌 언제나 밝게 빛나는 밤하늘의 별이야."
    ];

    const LOADING_MIN_VISIBLE_MS = 700;
    const LOADING_MAX_VISIBLE_MS = 1800;
    const loadingStartedAt = Date.now();

    let slideIndex = 0;
    let slideTimer = null;
    let slides = [];
    let slidePaused = false;
    let slidePauseLocked = false;
    let slideResumeTimer = null;
    let secretToastTimer = null;
    let titleClickCount = 0;
    let footerClickCount = 0;
    let bgmSecretClickCount = 0;
    let typedSecretBuffer = "";
    let endingFireworkPlayed = false;
    let endingFinishTimer = null;
    let currentScrollPercent = 0;
    let targetScrollPercent = 0;
    let currentParallax = 0;
    let targetParallax = 0;

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const safeStorage = {
        get(key) {
            try {
                return window.localStorage ? window.localStorage.getItem(key) : null;
            } catch (error) {
                console.warn("localStorage 읽기 오류:", error);
                return null;
            }
        },
        set(key, value) {
            try {
                if (window.localStorage) window.localStorage.setItem(key, value);
            } catch (error) {
                console.warn("localStorage 저장 오류:", error);
            }
        }
    };

    function onReady(callback) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback, { once: true });
        } else {
            callback();
        }
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.innerText = value;
    }

    function extractFallbackFromOnError(onErrorText) {
        if (!onErrorText) return DEFAULT_FALLBACK_IMAGE;
        const match = String(onErrorText).match(/this\.src\s*=\s*['"]([^'"]+)['"]/i);
        return match ? match[1] : DEFAULT_FALLBACK_IMAGE;
    }

    function setSafeImage(img, src, fallback = DEFAULT_FALLBACK_IMAGE, alt = "") {
        if (!img) return;

        const safeSrc = src || fallback || DEFAULT_FALLBACK_IMAGE;
        const safeFallback = fallback || DEFAULT_FALLBACK_IMAGE;

        img.onerror = function () {
            if (this.dataset.fallbackApplied === "true") return;
            this.dataset.fallbackApplied = "true";
            this.src = safeFallback;
        };

        if (alt) img.alt = alt;
        img.dataset.fallbackApplied = "false";
        img.src = safeSrc;
    }

    function hideLoadingScreen() {
        const loadingScreen = document.getElementById("loading-screen");
        if (!loadingScreen || loadingScreen.dataset.hidden === "true") return;

        const elapsed = Date.now() - loadingStartedAt;
        const remaining = Math.max(0, LOADING_MIN_VISIBLE_MS - elapsed);

        if (remaining > 0 && loadingScreen.dataset.hideScheduled !== "true") {
            loadingScreen.dataset.hideScheduled = "true";
            setTimeout(hideLoadingScreen, remaining);
            return;
        }

        if (remaining > 0) return;

        loadingScreen.dataset.hidden = "true";
        loadingScreen.classList.add("hide");
        setTimeout(() => {
            loadingScreen.style.display = "none";
        }, 580);
    }

    function closeWelcomeModal() {
        const modal = document.getElementById("welcome-modal");
        if (!modal) return;

        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        safeStorage.set("memorySiteWelcomeSeen", "true");
    }

    function toggleBGM() {
        const audio = document.getElementById("myAudio");
        const icon = document.getElementById("bgm-icon");
        const player = document.getElementById("bgm-container");
        if (!audio) return;

        if (audio.paused) {
            audio.play().then(() => {
                icon?.classList.add("rotating");
                player?.classList.add("playing");
                document.body.classList.add("bgm-playing");
            }).catch(error => {
                console.error("BGM 재생 오류:", error);
                alert("음원을 재생할 수 없어! 기기의 소리 설정이나 절전 모드를 확인해줘 🥺");
            });
        } else {
            audio.pause();
            icon?.classList.remove("rotating");
            player?.classList.remove("playing");
            document.body.classList.remove("bgm-playing");
        }
    }

    function toggleMute(event) {
        event?.stopPropagation();

        const audio = document.getElementById("myAudio");
        const muteIcon = document.getElementById("bgm-mute-icon");
        if (!audio || !muteIcon) return;

        audio.muted = !audio.muted;
        muteIcon.className = audio.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
    }

    async function sha256(text) {
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
            return Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, "0")).join("");
        }
        return sha256Fallback(text);
    }

    function sha256Fallback(text) {
        const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
        const maxWord = Math.pow(2, 32);
        const words = [];
        const hash = [];
        const k = [];
        const isComposite = {};
        let primeCounter = 0;

        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
                hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
                k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
            }
        }

        let ascii = unescape(encodeURIComponent(text));
        const asciiBitLength = ascii.length * 8;
        ascii += "\x80";

        while (ascii.length % 64 - 56) ascii += "\x00";

        for (let i = 0; i < ascii.length; i++) {
            words[i >> 2] |= ascii.charCodeAt(i) << (((3 - i) % 4) * 8);
        }

        words[words.length] = (asciiBitLength / maxWord) | 0;
        words[words.length] = asciiBitLength;

        for (let j = 0; j < words.length;) {
            const w = words.slice(j, j += 16);
            const oldHash = hash.slice(0);

            for (let i = 0; i < 64; i++) {
                const w15 = w[i - 15];
                const w2 = w[i - 2];
                const a = hash[0];
                const e = hash[4];
                const temp1 = hash[7]
                    + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                    + ((e & hash[5]) ^ ((~e) & hash[6]))
                    + k[i]
                    + (w[i] = i < 16 ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                    ) | 0);
                const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                    + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

                hash.pop();
                hash.unshift((temp1 + temp2) | 0);
                hash[4] = (hash[4] + temp1) | 0;
            }

            for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
        }

        let result = "";
        for (let i = 0; i < 8; i++) {
            for (let j = 3; j + 1; j--) {
                const byte = (hash[i] >> (j * 8)) & 255;
                result += (byte < 16 ? "0" : "") + byte.toString(16);
            }
        }
        return result;
    }

    async function checkPassword() {
        const inputElement = document.getElementById("letter-password");
        const lockScreen = document.getElementById("lock-screen");
        const realContent = document.getElementById("letter-real-content");
        const letterTextDiv = document.querySelector(".letter-text");
        const replyBtn = document.getElementById("reply-btn");
        const submitBtn = document.querySelector(".password-field button");

        if (!inputElement || !lockScreen || !realContent || !letterTextDiv || !replyBtn) return;

        const savedPasswordHash = "adfaab87038c95002ab05463e743201605457409b7129f9a3a8cddcb8caea1a2";
        const inputHash = await sha256(inputElement.value || "");

        if (inputHash === savedPasswordHash) {
            if (submitBtn) submitBtn.disabled = true;

            lockScreen.style.display = "none";
            realContent.style.display = "block";
            realContent.classList.add("unlocked");
            replyBtn.classList.remove("is-visible");

            const originalHTML = letterTextDiv.innerHTML;
            letterTextDiv.innerHTML = "";

            setTimeout(() => {
                typeWriterEffect(letterTextDiv, originalHTML, 20, () => {
                    replyBtn.classList.add("is-visible");
                    replyBtn.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 1000, fill: "forwards" });
                });
            }, 800);
        } else {
            alert("비밀번호가 틀렸어! 우리의 소중한 날짜를 입력해줘.");
            inputElement.value = "";
            inputElement.focus();
        }
    }

    function typeWriterEffect(element, html, baseSpeed, onComplete) {
        if (!element) return;

        const tokens = html.match(/<[^>]+>|[^<]/g) || [];
        let i = 0;
        let currentHTML = "";
        element.innerHTML = "";

        function type() {
            if (i < tokens.length) {
                const token = tokens[i];
                currentHTML += token;
                element.innerHTML = currentHTML;
                i += 1;

                if (token.startsWith("<")) {
                    type();
                } else {
                    const randomSpeed = Math.max(5, baseSpeed + (Math.random() * 20 - 10));
                    setTimeout(type, randomSpeed);
                }
            } else if (typeof onComplete === "function") {
                onComplete();
            }
        }
        type();
    }

    function openReplyBox() {
        document.getElementById("reply-modal")?.classList.add("show");
    }

    function closeReplyBox() {
        document.getElementById("reply-modal")?.classList.remove("show");
    }

    function sendReply() {
        const replyText = document.getElementById("reply-text");
        const text = replyText?.value || "";

        if (text.trim() === "") {
            alert("내용을 조금이라도 적어줘! 🥺");
            return;
        }

        alert("우리의 기록장에 편지가 잘 남겨졌어! 고마워. ❤️");

        const myEmail = "atritime@gmail.com";
        const subject = encodeURIComponent("[우리의 기록장] 사이트에서 누군가 보낸 답장이야.");
        const body = encodeURIComponent(text);

        window.location.href = `mailto:${myEmail}?subject=${subject}&body=${body}`;
        closeReplyBox();
        replyText.value = "";
    }

    function closeLightbox(event) {
        const lightbox = document.getElementById("lightbox");
        if (!lightbox) return;

        if (event) {
            const target = event.target;
            const clickedBackdrop = target === lightbox;
            const clickedClose = target?.classList?.contains("close-lightbox");
            if (!clickedBackdrop && !clickedClose) return;
            event.stopPropagation();
        }

        lightbox.classList.remove("show");
        document.body.classList.remove("lightbox-open");

        const lightboxImg = document.getElementById("lightbox-img");
        const lightboxTitle = document.getElementById("lightbox-title");
        const lightboxDesc = document.getElementById("lightbox-desc");

        if (lightboxImg) lightboxImg.removeAttribute("src");
        if (lightboxTitle) lightboxTitle.innerText = "";
        if (lightboxDesc) lightboxDesc.innerText = "";
    }

    function initLightbox() {
        const galleryImages = $$(".item-image img");
        const lightbox = document.getElementById("lightbox");
        const lightboxImg = document.getElementById("lightbox-img");
        const lightboxTitle = document.getElementById("lightbox-title");
        const lightboxDesc = document.getElementById("lightbox-desc");
        const closeButton = $(".close-lightbox");
        if (!lightbox || !lightboxImg) return;

        galleryImages.forEach(img => {
            img.style.cursor = "pointer";
            img.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();

                const item = img.closest(".gallery-item");
                const title = item?.querySelector(".item-title")?.innerText?.trim() || img.alt || "확대된 사진";
                const desc = item?.querySelector(".item-desc")?.innerText?.trim() || "";

                setSafeImage(lightboxImg, img.currentSrc || img.src, img.dataset.fallback || DEFAULT_FALLBACK_IMAGE, title);
                if (lightboxTitle) lightboxTitle.innerText = title;
                if (lightboxDesc) lightboxDesc.innerText = desc;

                lightbox.classList.add("show");
                document.body.classList.add("lightbox-open");
            });
        });

        lightboxImg.addEventListener("click", event => event.stopPropagation());
        closeButton?.addEventListener("click", closeLightbox);
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeLightbox();
        });
    }

    function createStar(x, y) {
        if (Math.random() > 0.75) return;

        const star = document.createElement("div");
        star.className = "mouse-star";

        const offsetX = (Math.random() - 0.5) * 15;
        const offsetY = (Math.random() - 0.5) * 15;
        const size = Math.random() * 6 + 6;

        star.style.left = `${x + offsetX}px`;
        star.style.top = `${y + offsetY}px`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        document.body.appendChild(star);
        setTimeout(() => star.remove(), 1000);
    }

    function updateDday() {
        const startDate = new Date("2026-04-16T00:00:00").getTime();
        const now = Date.now();
        let distance = now - startDate;
        const labelElement = document.querySelector(".d-day-label");

        if (Number.isNaN(startDate)) return;

        if (distance < 0) {
            if (labelElement) labelElement.innerText = "우리의 이야기가 시작되기까지";
            distance = startDate - now;
        } else if (labelElement) {
            labelElement.innerText = "우리의 이야기가 시작된 지";
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setText("days", String(days));
        setText("hours", String(hours).padStart(2, "0"));
        setText("minutes", String(minutes).padStart(2, "0"));
        setText("seconds", String(seconds).padStart(2, "0"));
    }

    function smoothScrollAnimation() {
        const scrollBar = document.getElementById("scroll-bar");
        const scrollStar = document.getElementById("scroll-star");
        const stars = document.querySelector(".stars");

        currentScrollPercent += (targetScrollPercent - currentScrollPercent) * 0.1;
        currentParallax += (targetParallax - currentParallax) * 0.1;

        if (scrollBar) scrollBar.style.width = `${Math.max(0, Math.min(currentScrollPercent, 100))}%`;
        if (scrollStar) scrollStar.style.transform = `rotate(${currentScrollPercent * 3.6}deg)`;
        if (stars) stars.style.transform = `translateY(-${currentParallax}px)`;

        window.requestAnimationFrame(smoothScrollAnimation);
    }

    function updateScrollTargets() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        targetScrollPercent = (scrollTop / docHeight) * 100;
        targetParallax = (scrollTop / docHeight) * 30;
    }

    function initScrollEffects() {
        window.addEventListener("scroll", updateScrollTargets, { passive: true });
        window.addEventListener("resize", updateScrollTargets);
        updateScrollTargets();
        smoothScrollAnimation();
    }

    function initFadeObserver() {
        const animateItems = $$(".timeline-item, .gallery-item");
        if (!animateItems.length) return;

        if (!("IntersectionObserver" in window)) {
            animateItems.forEach(item => item.classList.add("visible"));
            return;
        }

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add("visible");
            });
        }, { threshold: 0.15 });

        animateItems.forEach(item => observer.observe(item));
    }

    function initRandomMessage() {
        const msgElement = document.getElementById("random-message");
        if (!msgElement) return;
        msgElement.innerText = loveMessages[Math.floor(Math.random() * loveMessages.length)];
    }

    function initWelcomeModal() {
        const welcomeModal = document.getElementById("welcome-modal");
        const hasSeenWelcome = safeStorage.get("memorySiteWelcomeSeen") === "true";

        if (welcomeModal && !hasSeenWelcome) {
            setTimeout(() => {
                welcomeModal.classList.add("show");
                welcomeModal.setAttribute("aria-hidden", "false");
            }, 900);
        }
    }

    function initBgmControls() {
        const audio = document.getElementById("myAudio");
        const volumeSlider = document.getElementById("bgm-volume");
        const muteIcon = document.getElementById("bgm-mute-icon");
        const icon = document.getElementById("bgm-icon");
        const player = document.getElementById("bgm-container");
        if (!audio) return;

        if (volumeSlider) {
            const initialVolume = Number(volumeSlider.value);
            audio.volume = Number.isFinite(initialVolume) ? initialVolume : 0.6;
            volumeSlider.addEventListener("input", event => {
                event.stopPropagation();
                const volume = Number(volumeSlider.value);
                audio.volume = Number.isFinite(volume) ? volume : 0.6;
                audio.muted = audio.volume === 0;
                if (muteIcon) muteIcon.className = audio.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
            });
        }

        audio.addEventListener("play", () => {
            document.body.classList.add("bgm-playing");
            player?.classList.add("playing");
            icon?.classList.add("rotating");
        });
        audio.addEventListener("pause", () => {
            document.body.classList.remove("bgm-playing");
            player?.classList.remove("playing");
            icon?.classList.remove("rotating");
        });
        audio.addEventListener("ended", () => {
            document.body.classList.remove("bgm-playing");
            player?.classList.remove("playing");
            icon?.classList.remove("rotating");
        });
    }

    function initPasswordEnterKey() {
        const passwordInput = document.getElementById("letter-password");
        if (!passwordInput) return;

        passwordInput.addEventListener("keydown", event => {
            if (event.key === "Enter") checkPassword();
        });
    }

    function initSlideshow() {
        const galleryItems = $$(".gallery-item");
        const dotsContainer = document.getElementById("slide-dots");
        if (!galleryItems.length || !dotsContainer) return;

        slides = galleryItems.map(item => {
            const img = item.querySelector("img");
            const fallback = img?.dataset.fallback || extractFallbackFromOnError(img?.getAttribute("onerror"));
            if (img) {
                img.dataset.fallback = fallback;
                img.onerror = function () {
                    if (this.dataset.fallbackApplied === "true") return;
                    this.dataset.fallbackApplied = "true";
                    this.src = fallback;
                };
            }

            return {
                src: img?.getAttribute("src") || fallback,
                fallback,
                title: item.querySelector(".item-title")?.innerText || "우리의 순간",
                desc: item.querySelector(".item-desc")?.innerText || "소중한 기억"
            };
        });

        dotsContainer.innerHTML = "";
        slides.forEach((_, index) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "slide-dot";
            dot.setAttribute("aria-label", `${index + 1}번째 사진 보기`);
            dot.addEventListener("click", () => showSlide(index, true));
            dotsContainer.appendChild(dot);
        });

        showSlide(0);
        startSlideTimer();
        initSlideshowPauseControls();
    }

    function showSlide(index, resetTimer = false) {
        if (!slides.length) return;

        slideIndex = (index + slides.length) % slides.length;
        const currentSlide = slides[slideIndex];
        const slideImage = document.getElementById("slide-image");
        const slideTitle = document.getElementById("slide-title");
        const slideDesc = document.getElementById("slide-desc");
        const dots = $$(".slide-dot");

        if (slideImage) {
            slideImage.classList.remove("show");
            setTimeout(() => {
                setSafeImage(slideImage, currentSlide.src, currentSlide.fallback, currentSlide.title);
                slideImage.classList.add("show");
            }, 120);
        }

        if (slideTitle) slideTitle.innerText = currentSlide.title;
        if (slideDesc) slideDesc.innerText = currentSlide.desc;

        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle("active", dotIndex === slideIndex);
        });

        if (resetTimer) startSlideTimer();
    }

    function changeSlide(direction) {
        showSlide(slideIndex + direction, true);
    }

    function stopSlideTimer() {
        if (slideTimer) {
            clearInterval(slideTimer);
            slideTimer = null;
        }
    }

    function updateSlidePauseButton() {
        const pauseButton = document.getElementById("slide-pause-btn");
        if (!pauseButton) return;

        const icon = pauseButton.querySelector("i");
        const text = pauseButton.querySelector("span");
        const isPaused = slidePaused || slidePauseLocked;

        pauseButton.classList.toggle("paused", isPaused);
        pauseButton.setAttribute("aria-pressed", String(isPaused));

        if (icon) icon.className = isPaused ? "fa-solid fa-play" : "fa-solid fa-pause";
        if (text) text.innerText = isPaused ? "슬라이드 다시 재생" : "슬라이드 일시정지";
    }

    function setSlidePaused(paused, lock = false) {
        if (lock) slidePauseLocked = paused;
        slidePaused = paused;

        if (paused) {
            stopSlideTimer();
        } else if (!slidePauseLocked) {
            startSlideTimer();
        }

        updateSlidePauseButton();
    }

    function toggleSlidePause() {
        const nextPaused = !slidePauseLocked;
        setSlidePaused(nextPaused, true);
    }

    function pauseSlideTemporarily() {
        if (slidePauseLocked) return;
        clearTimeout(slideResumeTimer);
        setSlidePaused(true, false);
        slideResumeTimer = setTimeout(() => {
            if (!slidePauseLocked) setSlidePaused(false, false);
        }, 4500);
    }

    function initSlideshowPauseControls() {
        const slideshow = document.getElementById("slideshow");
        if (!slideshow) return;

        slideshow.addEventListener("mouseenter", () => {
            if (!slidePauseLocked) setSlidePaused(true, false);
        });

        slideshow.addEventListener("mouseleave", () => {
            if (!slidePauseLocked) setSlidePaused(false, false);
        });

        slideshow.addEventListener("touchstart", pauseSlideTemporarily, { passive: true });
        updateSlidePauseButton();
    }

    function startSlideTimer() {
        if (slidePaused || slidePauseLocked) return;
        if (slideTimer) clearInterval(slideTimer);
        slideTimer = setInterval(() => showSlide(slideIndex + 1), 3500);
    }

    function initMobileNavActiveState() {
        const navLinks = $$(".mobile-nav a");
        const sections = ["home", "timeline", "gallery", "letter"].map(id => document.getElementById(id)).filter(Boolean);
        if (!navLinks.length || !sections.length) return;

        let ticking = false;

        function setActiveMenu(activeId) {
            navLinks.forEach(link => {
                link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
            });
        }

        function getMobileNavOffset() {
            const nav = document.querySelector(".mobile-nav");
            if (!nav || window.getComputedStyle(nav).display === "none") return 0;
            return Math.ceil(nav.getBoundingClientRect().height + 18);
        }

        function updateActiveByScroll() {
            ticking = false;
            const checkLine = window.scrollY + Math.min(window.innerHeight * 0.42, 360);
            let activeId = sections[0].id;

            sections.forEach(section => {
                const top = section.getBoundingClientRect().top + window.scrollY - 40;
                if (checkLine >= top) activeId = section.id;
            });

            setActiveMenu(activeId);
        }

        function requestUpdate() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(updateActiveByScroll);
        }

        navLinks.forEach(link => {
            link.addEventListener("click", event => {
                const targetId = link.getAttribute("href")?.replace("#", "");
                const target = targetId ? document.getElementById(targetId) : null;
                if (!target) return;

                event.preventDefault();
                const targetTop = target.getBoundingClientRect().top + window.scrollY - getMobileNavOffset();
                window.scrollTo({ top: Math.max(targetTop, 0), behavior: "smooth" });
                setActiveMenu(targetId);
            });
        });

        window.addEventListener("scroll", requestUpdate, { passive: true });
        window.addEventListener("resize", requestUpdate);
        updateActiveByScroll();
    }

    function toggleThemePanel() {
        document.getElementById("theme-panel")?.classList.toggle("open");
    }

    function setSiteTheme(themeName) {
        const safeTheme = SITE_THEMES.includes(themeName) ? themeName : "night";

        document.body.classList.remove("theme-cherry", "theme-ocean", "theme-letter");
        if (safeTheme !== "night") document.body.classList.add(`theme-${safeTheme}`);

        safeStorage.set("memorySiteTheme", safeTheme);
        updateThemeButtons(safeTheme);
    }

    function updateThemeButtons(activeTheme) {
        $$(".theme-options button").forEach(button => {
            button.classList.toggle("active", button.dataset.theme === activeTheme);
        });
    }

    function initThemeSwitcher() {
        const savedTheme = safeStorage.get("memorySiteTheme") || "night";
        setSiteTheme(savedTheme);

        document.addEventListener("click", event => {
            const panel = document.getElementById("theme-panel");
            if (!panel || panel.contains(event.target)) return;
            panel.classList.remove("open");
        });
    }

    function updateVisitCount() {
        const visitElement = document.getElementById("visit-count");
        if (!visitElement) return;

        const storageKey = "memorySiteVisitCount";
        const currentCount = Number(safeStorage.get(storageKey) || 0) + 1;
        safeStorage.set(storageKey, String(currentCount));
        visitElement.innerHTML = `<i class="fa-solid fa-star"></i> 네가 이 기록장에 찾아온 건 <strong>${currentCount}</strong>번째야.`;
    }

    function launchHeartFireworks(event) {
        const source = event?.currentTarget || document.querySelector(".heart-burst-btn");
        const rect = source?.getBoundingClientRect?.();
        const startX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const startY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        const hearts = ["❤", "♥", "✦", "✧", "💜", "💗"];
        const colors = ["#ffffff", "#c7a4ff", "#ff8fd8", "#ffd1ec", "#b69cff"];

        for (let i = 0; i < 42; i++) {
            const particle = document.createElement("span");
            particle.className = "heart-particle";
            particle.textContent = hearts[Math.floor(Math.random() * hearts.length)];

            const angle = Math.random() * Math.PI * 2;
            const distance = 90 + Math.random() * 190;
            const moveX = Math.cos(angle) * distance;
            const moveY = Math.sin(angle) * distance - 70;
            const size = 13 + Math.random() * 17;
            const duration = 950 + Math.random() * 800;

            particle.style.setProperty("--start-x", `${startX}px`);
            particle.style.setProperty("--start-y", `${startY}px`);
            particle.style.setProperty("--move-x", `${moveX}px`);
            particle.style.setProperty("--move-y", `${moveY}px`);
            particle.style.setProperty("--heart-size", `${size}px`);
            particle.style.setProperty("--heart-duration", `${duration}ms`);
            particle.style.setProperty("--rotate", `${Math.random() * 720 - 360}deg`);
            particle.style.setProperty("--heart-color", colors[Math.floor(Math.random() * colors.length)]);

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), duration + 120);
        }
    }

    function initBasicProtection() {
        document.addEventListener("contextmenu", event => {
            if (event.target.closest("input, textarea")) return;
            event.preventDefault();
        });

        document.body.classList.add("protect-selection");

        document.addEventListener("keydown", event => {
            const key = event.key.toLowerCase();
            const blocked =
                event.key === "F12" ||
                (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
                (event.ctrlKey && ["u", "s"].includes(key));

            if (blocked) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
            return true;
        }, true);
    }

    function showSecretToast(message, duration = 2800) {
        const toast = document.getElementById("secret-toast");
        if (!toast) return;

        toast.innerHTML = message;
        toast.classList.add("show");
        clearTimeout(secretToastTimer);
        secretToastTimer = setTimeout(() => toast.classList.remove("show"), duration);
    }

    function revealEasterSecret() {
        const secretSection = document.getElementById("easter-secret");
        if (!secretSection) return;

        secretSection.classList.add("revealed");
        secretSection.setAttribute("aria-hidden", "false");
        showSecretToast("숨겨진 별빛 기록이 열렸어!", 3200);
        setTimeout(() => secretSection.scrollIntoView({ behavior: "smooth", block: "center" }), 450);
    }

    function hideEasterSecret() {
        const secretSection = document.getElementById("easter-secret");
        if (!secretSection) return;

        secretSection.classList.remove("revealed");
        secretSection.setAttribute("aria-hidden", "true");
        showSecretToast("비밀 기록을 다시 별빛 속에 숨겼어.", 2600);
    }

    function initEasterEggs() {
        const title = document.querySelector(".main-title");
        const footer = document.querySelector("footer");
        const bgmButton = document.querySelector(".bgm-main-btn");

        if (title) {
            title.style.cursor = "pointer";
            title.addEventListener("click", () => {
                titleClickCount += 1;
                if (titleClickCount === 3) showSecretToast("조금만 더 누르면 숨겨진 별빛이 열릴지도...?", 2200);
                if (titleClickCount >= 5) {
                    titleClickCount = 0;
                    revealEasterSecret();
                    launchHeartFireworks({ currentTarget: title });
                }
            });
        }

        document.addEventListener("keydown", event => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key.length !== 1) return;

            typedSecretBuffer = (typedSecretBuffer + event.key.toLowerCase()).slice(-12);
            if (typedSecretBuffer.includes("haeun") || typedSecretBuffer.includes("하은")) {
                typedSecretBuffer = "";
                showSecretToast("넌 언제나 밤하늘에서 빛나고 있는 별이야.", 3600);
                launchHeartFireworks({ currentTarget: document.querySelector(".intro-content") || document.body });
            }
        });

        if (footer) {
            footer.addEventListener("click", () => {
                footerClickCount += 1;
                clearTimeout(footer._easterTimer);
                footer._easterTimer = setTimeout(() => { footerClickCount = 0; }, 1200);

                if (footerClickCount >= 3) {
                    footerClickCount = 0;
                    showSecretToast("엔딩 크레딧으로 이동할게. 우리의 이야기는 계속될거야.", 2600);
                    document.getElementById("ending-credits")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            });
        }

        if (bgmButton) {
            bgmButton.addEventListener("click", () => {
                bgmSecretClickCount += 1;
                clearTimeout(bgmButton._easterTimer);
                bgmButton._easterTimer = setTimeout(() => { bgmSecretClickCount = 0; }, 1600);

                if (bgmSecretClickCount >= 7) {
                    bgmSecretClickCount = 0;
                    document.body.classList.add("bgm-playing");
                    showSecretToast("별빛 증폭 모드가 잠깐 켜졌어.", 2800);
                    setTimeout(() => {
                        const audio = document.getElementById("myAudio");
                        if (!audio || audio.paused) document.body.classList.remove("bgm-playing");
                    }, 4500);
                }
            });
        }
    }

    function initSeasonalEffects() {
        const layer = document.getElementById("seasonal-effect-layer");
        if (!layer) return;

        const month = new Date().getMonth() + 1;
        let season = "winter";
        let symbols = ["❄", "✦", "❅"];
        let count = 26;

        if (month >= 3 && month <= 5) {
            season = "spring";
            symbols = ["❀", "✿", "♡", "✦"];
            count = 24;
        } else if (month >= 6 && month <= 8) {
            season = "summer";
            symbols = ["○", "◌", "✧", "∙"];
            count = 22;
        } else if (month >= 9 && month <= 11) {
            season = "autumn";
            symbols = ["🍂", "✦", "◆", "❧"];
            count = 20;
        }

        document.body.classList.add(`season-${season}`);
        layer.innerHTML = "";

        for (let i = 0; i < count; i++) {
            const particle = document.createElement("span");
            particle.className = "seasonal-particle";
            particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            particle.style.setProperty("--season-left", `${Math.random() * 100}%`);
            particle.style.setProperty("--season-size", `${12 + Math.random() * 18}px`);
            particle.style.setProperty("--season-duration", `${9 + Math.random() * 12}s`);
            particle.style.setProperty("--season-delay", `${Math.random() * -18}s`);
            particle.style.setProperty("--season-drift", `${(Math.random() - 0.5) * 220}px`);
            particle.style.setProperty("--season-rotate", `${180 + Math.random() * 540}deg`);
            particle.style.setProperty("--season-opacity", `${0.25 + Math.random() * 0.45}`);
            layer.appendChild(particle);
        }
    }

    function updateEndingCreditsDistance() {
        const mask = document.querySelector(".credits-mask");
        const roll = document.getElementById("credits-roll");
        if (!mask || !roll) return;

        const maskHeight = Math.max(mask.clientHeight, 1);
        const rollHeight = Math.max(roll.scrollHeight, 1);
        const startY = Math.round(maskHeight + 40);
        const endY = Math.round(rollHeight + maskHeight * 0.45);
        const duration = Math.min(82, Math.max(48, Math.round((rollHeight + maskHeight) / 32)));

        mask.style.setProperty("--credits-roll-start", `${startY}px`);
        mask.style.setProperty("--credits-roll-end", `${endY}px`);
        mask.style.setProperty("--credits-duration", `${duration}s`);
    }

    function setEndingFinalVisible(isVisible) {
        const finalMessage = document.getElementById("credits-final-message");
        if (!finalMessage) return;
        finalMessage.setAttribute("aria-hidden", isVisible ? "false" : "true");
    }

    function prepareEndingCredits() {
        const credits = document.getElementById("ending-credits");
        const roll = document.getElementById("credits-roll");
        if (!credits || !roll) return false;

        updateEndingCreditsDistance();
        clearTimeout(endingFinishTimer);
        credits.classList.add("resetting");
        credits.classList.remove("play", "ended");
        setEndingFinalVisible(false);
        void roll.offsetHeight;
        credits.classList.remove("resetting");
        return true;
    }

    function finishEndingCredits() {
        const credits = document.getElementById("ending-credits");
        if (!credits) return;

        clearTimeout(endingFinishTimer);
        credits.classList.remove("play");
        credits.classList.add("ended");
        credits.dataset.creditsStarted = "ended";
        setEndingFinalVisible(true);
    }

    function getCreditsDurationMs() {
        const mask = document.querySelector(".credits-mask");
        const roll = document.getElementById("credits-roll");
        const cssDuration = mask ? getComputedStyle(mask).getPropertyValue("--credits-duration").trim() : "";
        const computedDuration = roll ? getComputedStyle(roll).animationDuration : "";
        const raw = cssDuration || computedDuration || "60s";
        const seconds = Number.parseFloat(raw);
        return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60000;
    }

    function startEndingCredits(force = false) {
        const credits = document.getElementById("ending-credits");
        const roll = document.getElementById("credits-roll");
        if (!credits || !roll) return;

        if (!force && (credits.classList.contains("play") || credits.classList.contains("ended") || credits.dataset.creditsStarted === "true")) {
            return;
        }

        if (!prepareEndingCredits()) return;

        credits.dataset.creditsStarted = "true";
        requestAnimationFrame(() => {
            credits.classList.add("play");
            clearTimeout(endingFinishTimer);
            endingFinishTimer = setTimeout(finishEndingCredits, getCreditsDurationMs() + 350);
        });

        if (!endingFireworkPlayed) {
            endingFireworkPlayed = true;
            setTimeout(() => {
                launchHeartFireworks({ currentTarget: credits.querySelector(".credits-header") || credits });
            }, 900);
        }
    }

    function checkEndingCreditsInView() {
        const credits = document.getElementById("ending-credits");
        if (!credits || credits.dataset.creditsStarted === "true" || credits.classList.contains("ended")) return;

        const rect = credits.getBoundingClientRect();
        const viewHeight = window.innerHeight || document.documentElement.clientHeight || 1;

        // 엔딩 크레딧 섹션에 실제로 도달했을 때 재생되도록 화면 중간 근처 진입 기준 사용
        if (rect.top <= viewHeight * 0.72 && rect.bottom >= viewHeight * 0.22) {
            startEndingCredits();
        }
    }

    function initEndingCredits() {
        const credits = document.getElementById("ending-credits");
        const roll = document.getElementById("credits-roll");
        if (!credits || !roll) return;

        prepareEndingCredits();
        credits.dataset.creditsStarted = "false";

        roll.addEventListener("animationend", function (event) {
            if (event.animationName !== "movieCreditsRoll") return;
            finishEndingCredits();
        });

        const observer = "IntersectionObserver" in window
            ? new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) startEndingCredits();
                });
            }, { threshold: 0.28 })
            : null;

        if (observer) observer.observe(credits);

        const requestCheck = () => requestAnimationFrame(checkEndingCreditsInView);
        window.addEventListener("scroll", requestCheck, { passive: true });
        window.addEventListener("resize", () => {
            const shouldKeepEnded = credits.classList.contains("ended");
            updateEndingCreditsDistance();
            if (shouldKeepEnded) setEndingFinalVisible(true);
        });
        window.addEventListener("load", () => {
            prepareEndingCredits();
            credits.dataset.creditsStarted = "false";
            requestCheck();
        }, { once: true });

        setTimeout(() => {
            updateEndingCreditsDistance();
            requestCheck();
        }, 250);
    }

    function restartEndingCredits(showToast = true) {
        const credits = document.getElementById("ending-credits");
        if (!credits) return;

        credits.dataset.creditsStarted = "false";
        startEndingCredits(true);

        if (showToast) showSecretToast("엔딩 크레딧을 다시 재생할게.", 2200);
    }

    function initImageFallbacks() {
        $$('img[onerror]').forEach(img => {
            const fallback = extractFallbackFromOnError(img.getAttribute("onerror"));
            img.dataset.fallback = fallback;
            img.removeAttribute("onerror");
            img.addEventListener("error", function () {
                if (this.dataset.fallbackApplied === "true") return;
                this.dataset.fallbackApplied = "true";
                this.src = fallback;
            });
        });
    }

    function initMouseStars() {
        document.addEventListener("mousemove", event => createStar(event.clientX, event.clientY), { passive: true });
        document.addEventListener("touchmove", event => {
            const touch = event.touches?.[0];
            if (touch) createStar(touch.clientX, touch.clientY);
        }, { passive: true });
    }

    function toggleMobileNav(event) {
        event?.preventDefault();
        event?.stopPropagation();

        const nav = document.querySelector(".mobile-nav");
        const toggleBtn = document.querySelector(".mobile-nav-toggle");
        const icon = toggleBtn?.querySelector("i");
        if (!nav || !toggleBtn) return;

        const isOpen = nav.classList.toggle("open");
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
        if (icon) icon.className = isOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
    }

    function closeMobileNav() {
        const nav = document.querySelector(".mobile-nav");
        const toggleBtn = document.querySelector(".mobile-nav-toggle");
        const icon = toggleBtn?.querySelector("i");
        if (!nav || !toggleBtn) return;

        nav.classList.remove("open");
        toggleBtn.setAttribute("aria-expanded", "false");
        if (icon) icon.className = "fa-solid fa-bars";
    }

    function initMobileNavToggle() {
        const nav = document.querySelector(".mobile-nav");
        if (!nav) return;

        $$(".mobile-nav a").forEach(link => {
            link.addEventListener("click", closeMobileNav);
        });

        document.addEventListener("click", event => {
            if (!nav.classList.contains("open")) return;
            if (nav.contains(event.target)) return;
            closeMobileNav();
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeMobileNav();
        });

        window.addEventListener("resize", closeMobileNav);
    }

    function init() {
        initImageFallbacks();
        initFadeObserver();
        initRandomMessage();
        initWelcomeModal();
        initBgmControls();
        initLightbox();
        initPasswordEnterKey();
        initSlideshow();
        initMobileNavActiveState();
        initMobileNavToggle();
        initThemeSwitcher();
        updateVisitCount();
        initBasicProtection();
        initSeasonalEffects();
        initEasterEggs();
        initEndingCredits();
        initScrollEffects();
        initMouseStars();
        updateDday();
        setInterval(updateDday, 1000);
    }

    window.toggleBGM = toggleBGM;
    window.toggleMute = toggleMute;
    window.closeWelcomeModal = closeWelcomeModal;
    window.checkPassword = checkPassword;
    window.openReplyBox = openReplyBox;
    window.closeReplyBox = closeReplyBox;
    window.sendReply = sendReply;
    window.closeLightbox = closeLightbox;
    window.changeSlide = changeSlide;
    window.toggleSlidePause = toggleSlidePause;
    window.toggleMobileNav = toggleMobileNav;
    window.toggleThemePanel = toggleThemePanel;
    window.setSiteTheme = setSiteTheme;
    window.launchHeartFireworks = launchHeartFireworks;
    window.hideEasterSecret = hideEasterSecret;
    window.restartEndingCredits = restartEndingCredits;

    window.addEventListener("load", hideLoadingScreen);
    setTimeout(hideLoadingScreen, LOADING_MAX_VISIBLE_MS);
    onReady(init);
})();
// =========================================
// 사이트 점검중 화면 제어 - 유지형 수정본
// =========================================

(function () {
    "use strict";

    /*
        전체 방문자에게 점검중 화면을 보여주고 싶으면 true
        평소에는 false
    */
    const MAINTENANCE_MODE = true;

    const STORAGE_KEY = "memorySiteMaintenanceMode";

    function saveMaintenanceState(value) {
        try {
            localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
        } catch (error) {
            document.cookie = `${STORAGE_KEY}=${value ? "on" : "off"}; path=/; max-age=31536000`;
        }
    }

    function getMaintenanceState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === "on") return true;
            if (saved === "off") return false;
        } catch (error) {
            const cookieValue = document.cookie
                .split("; ")
                .find(row => row.startsWith(`${STORAGE_KEY}=`))
                ?.split("=")[1];

            if (cookieValue === "on") return true;
            if (cookieValue === "off") return false;
        }

        return false;
    }

    function showMaintenanceScreen() {
        const screen = document.getElementById("maintenance-screen");
        if (!screen) return;

        screen.classList.add("show");
        screen.setAttribute("aria-hidden", "false");
        document.body.classList.add("maintenance-active");
    }

    function hideMaintenanceScreen() {
        const screen = document.getElementById("maintenance-screen");
        if (!screen) return;

        screen.classList.remove("show");
        screen.setAttribute("aria-hidden", "true");
        document.body.classList.remove("maintenance-active");
    }

    function initMaintenanceScreen() {
        const params = new URLSearchParams(window.location.search);
        const maintenanceParam = params.get("maintenance");

        /*
            ?maintenance=on  → 점검 화면 켜고 유지
            ?maintenance=off → 점검 화면 끄고 유지 해제
        */
        if (maintenanceParam === "on") {
            saveMaintenanceState(true);
        }

        if (maintenanceParam === "off") {
            saveMaintenanceState(false);
        }

        const savedMode = getMaintenanceState();

        if (MAINTENANCE_MODE || savedMode) {
            showMaintenanceScreen();
        } else {
            hideMaintenanceScreen();
        }
    }

    window.showMaintenanceScreen = function () {
        saveMaintenanceState(true);
        showMaintenanceScreen();
    };

    window.hideMaintenanceScreen = function () {
        saveMaintenanceState(false);
        hideMaintenanceScreen();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initMaintenanceScreen);
    } else {
        initMaintenanceScreen();
    }
})();
