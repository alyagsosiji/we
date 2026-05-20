(() => {
    "use strict";

    // final-v7-easter: 슬라이드 일시정지 + 로딩 최적화 + 라이트박스 설명 + 엔딩 완료 표시
    // [보안 및 안정성 강화 패치 결합 완료]

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
    const SITE_UPDATE_TEXT = "마지막 업데이트 : 2026.05.20 10:30";
    const LONG_PRESS_MS = 850;

    let slideIndex = 0;
    let slideTimer = null;
    let slides = [];
    let slidePaused = false;
    let slidePauseLocked = false;
    let slideResumeTimer = null;
    let secretToastTimer = null;
    let titleClickCount = 0;
    let footerClickCount = 0;
    let bgmSecretClickCount = 0; // 원본 변수명 100% 복원
    let typedSecretBuffer = "";
    let dateBuffer = ""; 
    let endingFireworkPlayed = false;
    let endingFinishTimer = null;
    let currentScrollPercent = 0;
    let targetScrollPercent = 0;
    let currentParallax = 0;
    let targetParallax = 0;
    let longPressTimer = null;
    let footerRewardShown = false;

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

    // =========================================
    // 🔒 사이트 보안 제어 장치 (우클릭, 소스 보기 단축키 완전 차단)
    // =========================================
    function initSiteSecurity() {
        document.addEventListener("contextmenu", event => {
            if (!event.target.closest("input, textarea")) {
                event.preventDefault();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "F12") {
                event.preventDefault();
            }
            if (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(event.key.toLowerCase())) {
                event.preventDefault();
            }
            if (event.ctrlKey && ["u", "s"].includes(event.key.toLowerCase())) {
                event.preventDefault();
            }
        });

        document.body.classList.add("protect-selection");
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
        if (Math.random() > 0.75) return; // 원본 확률 분기 복원

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
        setTimeout(() => star.remove(), 1000); // 원본 시간 복원
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

        currentScrollPercent += (targetScrollPercent - currentScrollPercent) * 0.1; // 원본 수식 가속도 복원
        currentParallax += (targetParallax - currentParallax) * 0.1;

        if (scrollBar) scrollBar.style.width = `${Math.max(0, Math.min(currentScrollPercent, 100))}%`;
        if (scrollStar) scrollStar.style.transform = `rotate(${currentScrollPercent * 3.6}deg)`; // 원본 회전축 처리 복원
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

        const frame = document.querySelector(".slideshow-frame");
        frame?.addEventListener("mouseenter", () => { if (!slidePauseLocked) { slidePaused = true; clearInterval(slideTimer); } });
        frame?.addEventListener("mouseleave", () => { if (!slidePauseLocked) { slidePaused = false; startSlideTimer(); } });
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
            const checkLine = window.scrollY + Math.min(window.innerHeight * 0.42, 360); // 원본 가중치 수식 복원
            let activeId = sections[0].id;

            for (const section of sections) {
                const top = section.offsetTop - getMobileNavOffset();
                if (checkLine >= top) {
                    activeId = section.id;
                }
            }
            setActiveMenu(activeId);
        }

        window.addEventListener("scroll", () => {
            if (!ticking) {
                window.requestAnimationFrame(updateActiveByScroll);
                ticking = true;
            }
        }, { passive: true });

        window.addEventListener("resize", updateActiveByScroll, { passive: true });
        updateActiveByScroll();
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

    function launchHeartFireworks(event) {
        const rect = event?.currentTarget?.getBoundingClientRect?.();
        const startX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const startY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        const hearts = ["❤", "♥", "✦", "✧", "💜", "💗"];
        const colors = ["#ffffff", "#c7a4ff", "#ff8fd8", "#ffd1ec", "#b69cff"];
        const maxParticles = window.innerWidth < 768 ? 24 : 45;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < maxParticles; i++) {
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

            fragment.appendChild(particle);
            setTimeout(() => particle.remove(), duration + 100);
        }
        document.body.appendChild(fragment);
    }

    function setSiteTheme(themeName) {
        const safeTheme = SITE_THEMES.includes(themeName) ? themeName : "night";
        document.body.classList.remove("theme-cherry", "theme-ocean", "theme-letter", "theme-our-night");
        if (safeTheme !== "night") document.body.classList.add(`theme-${safeTheme}`);
        safeStorage.set("memorySiteTheme", safeTheme);
        $$(".theme-options button").forEach(b => b.classList.toggle("active", b.dataset.theme === safeTheme));
    }

    function toggleThemePanel() {
        document.getElementById("theme-panel")?.classList.toggle("open");
    }

    // =========================================
    // 1. 점검 모드 제어 시스템
    // =========================================
    function readStorage(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } catch (error) {}
    }
    function runWhenReady(callback) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback, { once: true });
        } else {
            callback();
        }
    }
    function showMiniToast(message, duration = 2400) {
        const toast = document.getElementById("secret-toast");
        if (!toast) return;
        toast.innerHTML = message;
        toast.classList.add("show");
        clearTimeout(toast._extraFeatureTimer);
        toast._extraFeatureTimer = setTimeout(() => { toast.classList.remove("show"); }, duration);
    }

    function createMaintenanceScreenIfMissing() {
        let screen = document.getElementById("maintenance-screen");
        if (screen) return screen;
        screen = document.createElement("div");
        screen.id = "maintenance-screen";
        screen.className = "maintenance-screen";
        screen.setAttribute("aria-hidden", "true");
        screen.innerHTML = `
            <div class="maintenance-card">
                <div class="maintenance-orbit" aria-hidden="true"><span></span><i class="fa-solid fa-star"></i></div>
                <p class="maintenance-label">SITE MAINTENANCE</p>
                <h1>우리의 기록장을 잠시 정리하는 중이야.</h1>
                <p class="maintenance-message">더 예쁜 추억을 담기 위해 별빛을 다시 고르고 있어.<br>잠시 후 다시 찾아와줘.</p>
                <div class="maintenance-progress"><span></span></div>
                <p class="maintenance-small">To be continued under the same night sky.</p>
            </div>`;
        document.body.prepend(screen);
        return screen;
    }
    function enableMaintenanceScreen() {
        const screen = createMaintenanceScreenIfMissing();
        screen.classList.add("show");
        screen.setAttribute("aria-hidden", "false");
        document.documentElement.classList.add("maintenance-mode-active");
        document.body.classList.add("maintenance-mode-active");
    }
    function disableMaintenanceScreen() {
        const screen = document.getElementById("maintenance-screen");
        if (screen) {
            screen.classList.remove("show");
            screen.setAttribute("aria-hidden", "true");
        }
        document.documentElement.classList.remove("maintenance-mode-active");
        document.body.classList.remove("maintenance-mode-active");
    }
    function initMaintenanceModeCheck() {
        if (readStorage("memorySiteMaintenanceModeActive") === "true") {
            enableMaintenanceScreen();
        } else {
            disableMaintenanceScreen();
        }
    }

    // =========================================
    // 2. 이스터에그 제어 시스템
    // =========================================
    function showEasterToast(message, duration = 3000) {
        const toast = document.getElementById("secret-toast");
        if (!toast) return;
        toast.innerHTML = message;
        toast.classList.add("show");
        clearTimeout(showEasterToast._timer);
        showEasterToast._timer = setTimeout(() => { toast.classList.remove("show"); }, duration);
    }
    function burstAt(element, repeat = 1) {
        if (typeof window.launchHeartFireworks !== "function") return;
        const target = element || document.querySelector(".intro-content") || document.body;
        for (let i = 0; i < repeat; i += 1) {
            setTimeout(() => { window.launchHeartFireworks({ currentTarget: target }); }, i * 260);
        }
    }
    function ensureConstellationLayer() {
        let layer = document.getElementById("subtitle-constellation-easter");
        if (layer) return layer;
        layer = document.createElement("div");
        layer.id = "subtitle-constellation-easter";
        layer.className = "subtitle-constellation-easter";
        layer.setAttribute("aria-hidden", "true");
        layer.innerHTML = `
            <div class="constellation-card" onclick="event.stopPropagation()">
                <svg width="220" height="150" viewBox="0 0 220 150">
                    <line x1="30" y1="40" x2="85" y2="25" stroke="rgba(199,164,255,0.4)" stroke-width="1.5"/>
                    <line x1="85" y1="25" x2="140" y2="65" stroke="rgba(199,164,255,0.4)" stroke-width="1.5"/>
                    <line x1="140" y1="65" x2="190" y2="110" stroke="rgba(199,164,255,0.4)" stroke-width="1.5"/>
                    <circle cx="30" cy="40" r="4.5" fill="#fff"/>
                    <circle cx="85" cy="25" r="5" fill="#ffd1ec"/>
                    <circle cx="140" cy="65" r="4.5" fill="#fff"/>
                    <circle cx="190" cy="110" r="5.5" fill="#c7a4ff"/>
                </svg>
                <h4>카시오페아의 속삭임</h4>
                <p>우리의 날짜를 지켜보는 밤하늘의 네 번째 별빛 테마야.</p>
                <button type="button" onclick="window.hideSubtitleConstellationEaster()">숨기기</button>
            </div>`;
        layer.addEventListener("click", window.hideSubtitleConstellationEaster);
        document.body.appendChild(layer);
        return layer;
    }
    window.hideSubtitleConstellationEaster = function() {
        document.getElementById("subtitle-constellation-easter")?.classList.remove("show");
    };
    function showSubtitleConstellationEaster() {
        const layer = ensureConstellationLayer();
        setTimeout(() => layer.classList.add("show"), 50);
    }
    function initSubtitleEasterEgg() {
        document.querySelector(".sub-title")?.addEventListener("click", () => {
            showSubtitleConstellationEaster();
            showEasterToast("🌌 부드러운 성좌의 비밀을 찾았어!", 2800);
            burstAt(document.querySelector(".sub-title"), 1);
        });
    }
    function activateOurNightTheme() {
        document.body.classList.add("theme-our-night");
        safeSet("memorySiteHiddenTheme", "our-night");
        showEasterToast("🎆 <strong>히든 테마 [우리의 밤]</strong> 플레이어가 활성화되었어!", 3500);
        burstAt(null, 3);
    }
    function clearLongPressTimer() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }
    function addLongPress(target) {
        if (!target) return;
        const start = (event) => {
            if (event.type === "mousedown" && event.button !== 0) return;
            clearLongPressTimer();
            longPressTimer = setTimeout(activateOurNightTheme, LONG_PRESS_MS);
        };
        target.addEventListener("mousedown", start);
        target.addEventListener("touchstart", start, { passive: true });
        ["mouseup", "mouseleave", "touchend", "touchcancel", "dragstart"].forEach(type => {
            target.addEventListener(type, clearLongPressTimer);
        });
    }
    function initHiddenThemeEgg() {
        if (readStorage("memorySiteHiddenTheme") === "our-night") {
            document.body.classList.add("theme-our-night");
        }
        addLongPress(document.querySelector(".welcome-icon"));
        addLongPress(document.querySelector(".theme-toggle-btn"));
    }
    function initBgmDiskEggBoost() {
        const diskButton = document.querySelector(".bgm-main-btn");
        if (!diskButton) return;
        diskButton.addEventListener("click", () => {
            bgmSecretClickCount += 1; // 원본 구조 보존
            clearTimeout(initBgmDiskEggBoost._timer);
            initBgmDiskEggBoost._timer = setTimeout(() => { bgmSecretClickCount = 0; }, 3000);
            if (bgmSecretClickCount >= 7) {
                bgmSecretClickCount = 0;
                document.body.classList.add("bgm-playing");
                showEasterToast("✨ 별빛 증폭 모드가 잠깐 켜졌어.", 2800);
                setTimeout(() => {
                    const audio = document.getElementById("myAudio");
                    if (!audio || audio.paused) document.body.classList.remove("bgm-playing");
                }, 4500);
            }
        });
    }
    function initFooterSecretReward() {
        document.querySelector("footer")?.addEventListener("click", () => {
            footerClickCount += 1;
            if (footerClickCount === 4) {
                showEasterToast("⭐ 엇! 발자국 소리에 밤하늘이 흔들려 (2번 더..)", 2400);
            } else if (footerClickCount >= 6) {
                footerClickCount = 0;
                if (!footerRewardShown) {
                    footerRewardShown = true;
                    showEasterToast("🎁 <em>To be continued...</em> 밤이 지나도 추억은 영원히.", 4500);
                    burstAt(document.querySelector("footer"), 2);
                }
            }
        });
    }
    function initKeyboardEasterEggs() {
        document.addEventListener("keydown", event => {
            if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
            const k = event.key.toLowerCase();
            typedSecretBuffer = (typedSecretBuffer + k).slice(-12);

            if (typedSecretBuffer.includes("haeun") || typedSecretBuffer.includes("하은")) {
                typedSecretBuffer = "";
                showEasterToast("💝 넌 언제나 내 밤하늘에서 가장 밝게 빛나는 별이야.", 3600);
                burstAt(null, 2);
            }
            if (/[0-9]/.test(k)) {
                dateBuffer = (dateBuffer + k).slice(-4);
                if (dateBuffer === "0416") {
                    dateBuffer = "";
                    showEasterToast("📅 0416, 우리의 첫 페이지가 시작된 소중한 기적.", 3600);
                    burstAt(null, 2);
                }
            }
        });
    }
    function initMainTitleEasterEgg() {
        document.querySelector(".main-title")?.addEventListener("click", () => {
            titleClickCount += 1;
            if (titleClickCount >= 5) {
                titleClickCount = 0;
                document.getElementById("easter-secret")?.classList.add("revealed");
                showEasterToast("🌌 숨겨진 별빛 기록이 열렸어!", 3200);
                launchHeartFireworks({ currentTarget: document.querySelector(".main-title") });
            }
        });
    }
    
    // index.html에서 명시적으로 사용하는 별빛 팝업 숨기기 기믹 연동 복원
    window.hideEasterSecret = function() {
        document.getElementById("easter-secret")?.classList.remove("revealed");
    };

    function initEasterEggsSystem() {
        initSubtitleEasterEgg();
        initHiddenThemeEgg();
        initBgmDiskEggBoost();
        initFooterSecretReward();
        initKeyboardEasterEggs();
        initMainTitleEasterEgg();
    }

    // =========================================
    // 3. 위로 가기 별 버튼
    // =========================================
    function initBackToTopStar() {
        if (document.getElementById("back-to-top-star")) return;
        const button = document.createElement("button");
        button.id = "back-to-top-star";
        button.className = "back-to-top-star";
        button.type = "button";
        button.innerHTML = '<i class="fa-solid fa-star"></i>';
        document.body.appendChild(button);

        button.onclick = () => { window.scrollTo({ top: 0, behavior: "smooth" }); };
        window.addEventListener("scroll", () => {
            button.classList.toggle("show", window.scrollY > 480);
        }, { passive: true });
    }

    // =========================================
    // 4. 이미지 스켈레톤 UI 처리
    // =========================================
    function initImageSkeletons() {
        $$(".image-wrapper img, .item-image img, #slide-image").forEach(img => {
            const container = img.closest(".image-wrapper, .item-image, .slide-image-wrap");
            if (!container) return;
            container.classList.add("memory-img-skeleton");

            const loaded = () => container.classList.add("memory-img-loaded");
            if (img.complete && img.naturalWidth > 0) loaded();
            else img.addEventListener("load", loaded, { once: true });
        });
    }

    // =========================================
    // 5. 시간대별 인사 문구
    // =========================================
    function initTimeGreeting() {
        if (document.getElementById("memory-time-greeting")) return;
        const hour = new Date().getHours();
        let iconClass = "fa-moon";
        let message = "밤하늘이 예쁜 시간이야. 천천히 우리의 기록장을 둘러봐.";

        if (hour >= 5 && hour < 11) {
            iconClass = "fa-sun"; message = "좋은 아침이야. 오늘도 우리의 이야기가 조용히 빛나고 있어.";
        } else if (hour >= 11 && hour < 17) {
            iconClass = "fa-cloud-sun"; message = "햇살이 머무는 시간이야. 오늘의 기록도 따뜻하기를.";
        } else if (hour >= 17 && hour < 21) {
            iconClass = "fa-star-half-stroke"; message = "노을이 내려앉는 시간이야. 우리의 순간들도 예쁘게 남아 있어.";
        }

        const greeting = document.createElement("p");
        greeting.id = "memory-time-greeting";
        greeting.className = "memory-time-greeting";
        greeting.innerHTML = `<i class="fa-solid ${iconClass}"></i>${message}`;

        const randomMessage = document.getElementById("random-message");
        const visitCount = document.getElementById("visit-count");
        const introContent = document.querySelector(".intro-content");

        if (randomMessage) {
            randomMessage.insertAdjacentElement("afterend", greeting);
        } else if (visitCount) {
            visitCount.insertAdjacentElement("beforebegin", greeting);
        } else if (introContent) {
            introContent.appendChild(greeting);
        }
    }

    // =========================================
    // 6. 플레이어 볼륨 메모리 저장
    // =========================================
    function initBgmVolumeMemory() {
        const audio = document.getElementById("myAudio");
        const volumeSlider = document.getElementById("bgm-volume");
        const muteIcon = document.getElementById("bgm-mute-icon");
        if (!audio || !volumeSlider) return;

        const savedVolume = safeStorage.get("memorySiteBgmVolume");
        if (savedVolume !== null) {
            audio.volume = parseFloat(savedVolume);
            volumeSlider.value = savedVolume;
        }
        const savedMuted = safeStorage.get("memorySiteBgmMuted");
        if (savedMuted === "true") audio.muted = true;

        function updateMuteIcon() {
            if (!muteIcon) return;
            muteIcon.className = audio.muted || audio.volume === 0 ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
        }

        function saveCurrentVolume() {
            safeStorage.set("memorySiteBgmVolume", String(audio.volume));
            safeStorage.set("memorySiteBgmMuted", audio.muted ? "true" : "false");
            volumeSlider.classList.add("memory-volume-saved");
            clearTimeout(volumeSlider._savedTimer);
            volumeSlider._savedTimer = setTimeout(() => { volumeSlider.classList.remove("memory-volume-saved"); }, 650);
            updateMuteIcon();
        }

        volumeSlider.addEventListener("input", function () {
            audio.volume = parseFloat(volumeSlider.value);
            audio.muted = audio.volume === 0;
            saveCurrentVolume();
        });
        audio.addEventListener("volumechange", function () {
            volumeSlider.value = String(audio.volume);
            saveCurrentVolume();
        });
        updateMuteIcon();
    }

    // =========================================
    // 7. 엔딩 크레딧 감상 완료 배지
    // =========================================
    function createEndingCompleteBadge() {
        let badge = document.getElementById("ending-complete-badge");
        if (badge) return badge;
        badge = document.createElement("p");
        badge.id = "ending-complete-badge";
        badge.className = "ending-complete-badge";
        badge.innerHTML = '<i class="fa-solid fa-award"></i>엔딩까지 함께한 사람';
        document.querySelector(".intro-content")?.appendChild(badge);
        return badge;
    }
    function initEndingCompleteBadge() {
        const credits = document.getElementById("ending-credits");
        if (!credits) return;

        const handleBadge = () => {
            if (credits.classList.contains("ended")) {
                const badge = createEndingCompleteBadge();
                badge.classList.add("show");
                document.body.classList.add("has-ending-complete-badge");
                safeStorage.set("memorySiteEndingCompleteBadge", "true");
            }
        };

        new MutationObserver(handleBadge).observe(credits, { attributes: true, attributeFilter: ["class"] });
        if (safeStorage.get("memorySiteEndingCompleteBadge") === "true") {
            document.body.classList.add("has-ending-complete-badge");
            setTimeout(() => {
                createEndingCompleteBadge().classList.add("show");
            }, 600);
        }
    }

    // =========================================
    // 8. 모바일 터치이벤트 및 폴백 (마우스별빛 포함)
    // =========================================
    function initMouseStars() {
        document.addEventListener("mousemove", event => createStar(event.clientX, event.clientY), { passive: true });
        document.addEventListener("touchmove", event => {
            const touch = event.touches?.[0];
            if (touch) createStar(touch.clientX, touch.clientY);
        }, { passive: true });
    }

    // =========================================
    // 9. 테마 선택 기능 메모리 보완
    // =========================================
    function initThemePanelMemory() {
        $$(".theme-options button").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTheme = btn.dataset.theme;
                if (targetTheme) setSiteTheme(targetTheme);
            });
        });
        document.querySelector(".theme-toggle-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleThemePanel();
        });
    }

    // =========================================
    // 10. 기록장 업데이트 알림
    // =========================================
    function initUpdateNotice() {
        if (document.getElementById("memory-update-notice")) return;

        const notice = document.createElement("p");
        notice.id = "memory-update-notice";
        notice.className = "memory-update-notice";
        notice.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i>${SITE_UPDATE_TEXT}`;

        const timeGreeting = document.getElementById("memory-time-greeting");
        const visitCount = document.getElementById("visit-count");
        const introContent = document.querySelector(".intro-content");

        if (timeGreeting) {
            timeGreeting.insertAdjacentElement("afterend", notice);
        } else if (visitCount) {
            visitCount.insertAdjacentElement("beforebegin", notice);
        } else if (introContent) {
            introContent.appendChild(notice);
        }
    }

    // =========================================
    // 엔딩 크레딧 핵심 조율 시스템 (세부 분할 함수 복원)
    // =========================================
    function initEndingCreditsObserver() {
        const credits = document.getElementById("ending-credits");
        if (!credits || !("IntersectionObserver" in window)) return;
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting && credits.dataset.creditsStarted !== "playing" && !credits.classList.contains("ended")) {
                    startEndingCreditsRoll();
                    observer.unobserve(credits);
                }
            });
        }, { threshold: window.innerWidth < 768 ? 0.15 : 0.28 });
        observer.observe(credits);
    }
    function updateEndingCreditsDistance() {
        const mask = document.querySelector(".credits-mask");
        const roll = document.getElementById("credits-roll");
        if (!mask || !roll) return;
        const maskHeight = mask.getBoundingClientRect().height;
        const rollHeight = roll.getBoundingClientRect().height;
        mask.style.setProperty("--credits-box-height", `${maskHeight}px`);
        mask.style.setProperty("--credits-roll-start", `${maskHeight + 40}px`);
        mask.style.setProperty("--credits-roll-end", `${rollHeight + 50}px`);
    }
    function setEndingFinalVisible(visible) {
        const msg = document.getElementById("credits-final-message");
        if (!msg) return;
        msg.setAttribute("aria-hidden", visible ? "false" : "true");
        msg.style.opacity = visible ? "1" : "0";
        msg.style.visibility = visible ? "visible" : "hidden";
        msg.style.transform = visible ? "scale(1)" : "scale(0.96)";
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
    function startEndingCreditsRoll() {
        const credits = document.getElementById("ending-credits");
        const roll = document.getElementById("credits-roll");
        if (!credits || !roll || credits.dataset.creditsStarted === "playing" || credits.classList.contains("ended")) return;

        prepareEndingCredits();
        credits.classList.add("play");
        credits.dataset.creditsStarted = "playing";

        const mask = document.querySelector(".credits-mask");
        const cssDuration = mask ? getComputedStyle(mask).getPropertyValue("--credits-duration").trim() : "";
        const durationMs = (parseFloat(cssDuration) || 64) * 1000;

        endingFinishTimer = setTimeout(finishEndingCredits, durationMs);

        if (!endingFireworkPlayed) {
            endingFireworkPlayed = true;
            setTimeout(() => { burstAt(roll, 1); }, 800);
        }
    }
    window.restartEndingCredits = function() {
        const credits = document.getElementById("ending-credits");
        if (credits) {
            credits.dataset.creditsStarted = "none";
            credits.classList.remove("ended");
            startEndingCreditsRoll();
            showEasterToast("🎬 엔딩 크레딧을 처음부터 다시 재생할게.", 2200);
        }
    };

    function initSeasonalEffects() {
        const layer = document.getElementById("seasonal-effect-layer");
        if (!layer) return;
        const month = new Date().getMonth() + 1;
        let season = "winter";
        let symbols = ["❄", "✦", "❅"];
        let count = 26;

        if (month >= 3 && month <= 5) {
            season = "spring"; symbols = ["❀", "✿", "♡", "✦"]; count = 24; // 원본 배열 복원
        } else if (month >= 6 && month <= 8) {
            season = "summer"; symbols = ["🫧", "✨", "🫧"]; count = 20;
        } else if (month >= 9 && month <= 11) {
            season = "autumn"; symbols = ["🍁", "🍂", "✦"]; count = 22;
        }

        document.body.classList.add(`season-${season}`);
        layer.innerHTML = "";
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
            const particle = document.createElement("span");
            particle.className = "seasonal-particle";
            particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            particle.style.setProperty("--season-left", `${Math.random() * 100}vw`);
            particle.style.setProperty("--season-size", `${Math.random() * 12 + 10}px`);
            particle.style.setProperty("--season-opacity", `${Math.random() * 0.4 + 0.25}`);
            particle.style.setProperty("--season-duration", `${Math.random() * 6 + 7}s`);
            particle.style.setProperty("--season-delay", `${Math.random() * -12}s`);
            particle.style.setProperty("--season-drift", `${Math.random() * 140 - 70}px`);
            particle.style.setProperty("--season-rotate", `${Math.random() * 360}deg`);
            fragment.appendChild(particle);
        }
        layer.appendChild(fragment);
    }

    function changeSlide(direction) { showSlide(slideIndex + direction, true); }
    function showSlide(index, resetTimer = false) {
        if (!slides.length) return;
        slideIndex = (index + slides.length) % slides.length;
        const currentSlide = slides[slideIndex];
        const slideImage = document.getElementById("slide-image");
        const slideTitle = document.getElementById("slide-title");
        const slideDesc = document.getElementById("slide-desc");

        if (slideImage) {
            slideImage.classList.remove("show");
            setTimeout(() => {
                setSafeImage(slideImage, currentSlide.src, currentSlide.fallback, currentSlide.title);
                slideImage.classList.add("show");
            }, 120);
        }
        if (slideTitle) slideTitle.innerText = currentSlide.title;
        if (slideDesc) slideDesc.innerText = currentSlide.desc;

        $$(".slide-dot").forEach((dot, dotIndex) => {
            dot.classList.toggle("active", dotIndex === slideIndex);
        });
        if (resetTimer) startSlideTimer();
    }
    function startSlideTimer() {
        if (slidePaused || slidePauseLocked) return;
        clearInterval(slideTimer);
        slideTimer = setInterval(() => { showSlide(slideIndex + 1); }, 3500);
    }
    function toggleSlidePause() {
        const btn = document.getElementById("slide-pause-btn");
        slidePauseLocked = !slidePauseLocked;
        slidePaused = slidePauseLocked;

        if (slidePauseLocked) {
            clearInterval(slideTimer);
            if (btn) {
                btn.setAttribute("aria-pressed", "true");
                btn.classList.add("paused");
                btn.querySelector("span").innerText = "슬라이드 다시 재생";
                btn.querySelector("i").className = "fa-solid fa-play";
            }
        } else {
            startSlideTimer();
            if (btn) {
                btn.setAttribute("aria-pressed", "false");
                btn.classList.remove("paused");
                btn.querySelector("span").innerText = "슬라이드 일시정지";
                btn.querySelector("i").className = "fa-solid fa-pause";
            }
        }
    }

    function initMobileNavClickAndResize() {
        $$(".mobile-nav-links a").forEach(link => {
            link.addEventListener("click", event => {
                document.querySelector(".mobile-nav")?.classList.remove("open");
                const toggleIcon = document.querySelector(".mobile-nav-toggle i");
                if (toggleIcon) toggleIcon.className = "fa-solid fa-bars";
                
                const targetId = link.getAttribute("href")?.replace("#", "");
                const target = targetId ? document.getElementById(targetId) : null;
                if (target) {
                    event.preventDefault();
                    window.scrollTo({
                        top: target.getBoundingClientRect().top + window.scrollY - 70,
                        behavior: "smooth"
                    });
                }
            });
        });
        document.addEventListener("click", event => {
            if (!event.target.closest(".mobile-nav")) {
                document.querySelector(".mobile-nav")?.classList.remove("open");
                const toggleIcon = document.querySelector(".mobile-nav-toggle i");
                if (toggleIcon) toggleIcon.className = "fa-solid fa-bars";
            }
        });
    }

    function initExtraSafeFeatures() {
        initBackToTopStar();
        initImageSkeletons();
        initTimeGreeting();
        initUpdateNotice();
        initEndingCompleteBadge();
        initBgmVolumeMemory();
    }

    function init() {
        initSiteSecurity(); // 보안 구동 추가
        const savedVisit = safeStorage.get("memorySiteVisitCount") || "0";
        const newVisit = parseInt(savedVisit, 10) + 1;
        safeStorage.set("memorySiteVisitCount", String(newVisit));
        setText("visit-count", `★ 네가 이 기록장에 찾아온 건 ${newVisit}번째야.`);

        initLightbox();
        updateDday(); setInterval(updateDday, 1000);
        initScrollEffects();
        initFadeObserver();
        initSlideshow();
        initMobileNavActiveState();
        initMobileNavClickAndResize();
        initThemePanelMemory();
        initEasterEggsSystem();
        initSeasonalEffects();
        initEndingCreditsObserver();
        initRandomMessage();
        initWelcomeModal();
        initBgmControls();
        initPasswordEnterKey();
        initImageFallbacks();
        initMouseStars();
        initMaintenanceModeCheck();

        $$(".mobile-nav-toggle").forEach(btn => {
            btn.addEventListener("click", toggleMobileNav);
        });
    }

    window.toggleBGM = toggleBGM;
    window.toggleMute = toggleMute;
    window.checkPassword = checkPassword;
    window.openReplyBox = openReplyBox;
    window.closeReplyBox = closeReplyBox;
    window.sendReply = sendReply;
    window.closeLightbox = closeLightbox;
    window.closeWelcomeModal = closeWelcomeModal;
    window.launchHeartFireworks = launchHeartFireworks;
    window.setSiteTheme = setSiteTheme;
    window.toggleThemePanel = toggleThemePanel;
    window.changeSlide = changeSlide;
    window.toggleSlidePause = toggleSlidePause;

    window.addEventListener("load", hideLoadingScreen, { once: true });
    setTimeout(hideLoadingScreen, LOADING_MAX_VISIBLE_MS);
    runWhenReady(init);
    runWhenReady(initExtraSafeFeatures);
})();
