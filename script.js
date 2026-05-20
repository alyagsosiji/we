(() => {
    "use strict";

    /* ==========================================================================
       [통합본] 우리의 기록장 - 기능 누락 제거 및 안전 인터페이스 제어 스크립트
       ========================================================================== */

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
    const SITE_UPDATE_TEXT = "마지막 업데이트 : 2026.05.19 17:00";
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
    let bgmSecretClickCount = 0; 
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
            try { return window.localStorage ? window.localStorage.getItem(key) : null; } 
            catch (e) { return null; }
        },
        set(key, value) {
            try { if (window.localStorage) window.localStorage.setItem(key, value); } 
            catch (e) {}
        }
    };

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

    /* 🔒 [보안 추가] 무단 우클릭 / F12 개발자도구 / 핵심 소스보기 단축키 전면 제어 기믹 */
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
        setTimeout(() => { loadingScreen.style.display = "none"; }, 580);
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
            }).catch(e => {
                alert("음원을 재생할 수 없어! 기기의 소리 설정이나 브라우저 권한을 확인해줘 🥺");
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
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
        }
        return sha256Fallback(text);
    }

    function sha256Fallback(text) {
        const rightRotate = (v, a) => (v >>> a) | (v << (32 - a));
        const maxWord = Math.pow(2, 32);
        const words = []; const hash = []; const k = []; const isComposite = {}; let primeCounter = 0;

        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
                hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
                k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
            }
        }
        let ascii = unescape(encodeURIComponent(text));
        const asciiBitLength = ascii.length * 8; ascii += "\x80";
        while (ascii.length % 64 - 56) ascii += "\x00";
        for (let i = 0; i < ascii.length; i++) { words[i >> 2] |= ascii.charCodeAt(i) << (((3 - i) % 4) * 8); }
        words[words.length] = (asciiBitLength / maxWord) | 0; words[words.length] = asciiBitLength;

        for (let j = 0; j < words.length;) {
            const w = words.slice(j, j += 16); const oldHash = hash.slice(0);
            for (let i = 0; i < 64; i++) {
                const w15 = w[i - 15]; const w2 = w[i - 2]; const a = hash[0]; const e = hash[4];
                const temp1 = hash[7]
                    + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                    + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i]
                    + (w[i] = i < 16 ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
                const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
                hash.pop(); hash.unshift((temp1 + temp2) | 0); hash[4] = (hash[4] + temp1) | 0;
            }
            for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
        }
        let result = "";
        for (let i = 0; i < 8; i++) {
            for (let j = 3; j + 1; j--) { const byte = (hash[i] >> (j * 8)) & 255; result += (byte < 16 ? "0" : "") + byte.toString(16); }
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
            inputElement.value = ""; inputElement.focus();
        }
    }

    function typeWriterEffect(element, html, baseSpeed, onComplete) {
        if (!element) return;
        const tokens = html.match(/<[^>]+>|[^<]/g) || [];
        let i = 0; let currentHTML = ""; element.innerHTML = "";

        function type() {
            if (i < tokens.length) {
                const token = tokens[i]; currentHTML += token; element.innerHTML = currentHTML; i += 1;
                if (token.startsWith("<")) { type(); } 
                else { setTimeout(type, Math.max(5, baseSpeed + (Math.random() * 20 - 10))); }
            } else if (typeof onComplete === "function") {
                onComplete();
            }
        }
        type();
    }

    function openReplyBox() { document.getElementById("reply-modal")?.classList.add("show"); }
    function closeReplyBox() { document.getElementById("reply-modal")?.classList.remove("show"); }

    function sendReply() {
        const replyText = document.getElementById("reply-text");
        const text = replyText?.value || "";
        if (text.trim() === "") { alert("내용을 조금이라도 적어줘! 🥺"); return; }

        alert("우리의 기록장에 편지가 잘 남겨졌어! 고마워. ❤️");
        const myEmail = "atritime@gmail.com";
        const subject = encodeURIComponent("[우리의 기록장] 사이트에서 누군가 보낸 답장이야.");
        const body = encodeURIComponent(text);

        window.location.href = `mailto:${myEmail}?subject=${subject}&body=${body}`;
        closeReplyBox(); replyText.value = "";
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
        if (lightboxImg) lightboxImg.removeAttribute("src");
    }

    function initLightbox() {
        const galleryImages = $$(".item-image img");
        const lightbox = document.getElementById("lightbox");
        const lightboxImg = document.getElementById("lightbox-img");
        const lightboxTitle = document.getElementById("lightbox-title");
        const lightboxDesc = document.getElementById("lightbox-desc");
        if (!lightbox || !lightboxImg) return;

        galleryImages.forEach(img => {
            img.style.cursor = "pointer";
            img.addEventListener("click", event => {
                event.preventDefault(); event.stopPropagation();
                const item = img.closest(".gallery-item");
                const title = item?.querySelector(".item-title")?.innerText?.trim() || img.alt || "추억 사진";
                const desc = item?.querySelector(".item-desc")?.innerText?.trim() || "";

                setSafeImage(lightboxImg, img.currentSrc || img.src, img.dataset.fallback || DEFAULT_FALLBACK_IMAGE, title);
                if (lightboxTitle) lightboxTitle.innerText = title;
                if (lightboxDesc) lightboxDesc.innerText = desc;

                lightbox.classList.add("show");
                document.body.classList.add("lightbox-open");
            });
        });
    }

    function createStar(x, y) {
        if (Math.random() > 0.75) return;
        const star = document.createElement("div");
        star.className = "mouse-star";
        const offsetX = (Math.random() - 0.5) * 15; const offsetY = (Math.random() - 0.5) * 15; const size = Math.random() * 6 + 6;

        star.style.left = `${x + offsetX}px`; star.style.top = `${y + offsetY}px`; star.style.width = `${size}px`; star.style.height = `${size}px`;
        document.body.appendChild(star);
        setTimeout(() => star.remove(), 1000);
    }

    function updateDday() {
        const startDate = new Date("2026-04-16T00:00:00").getTime();
        const now = Date.now(); let distance = now - startDate;
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

        setText("days", String(days)); setText("hours", String(hours).padStart(2, "0"));
        setText("minutes", String(minutes).padStart(2, "0")); setText("seconds", String(seconds).padStart(2, "0"));
    }

    function smoothScrollAnimation() {
        const scrollBar = document.getElementById("scroll-bar");
        const scrollStar = document.getElementById("scroll-star");
        const stars = document.querySelector(".stars");

        currentScrollPercent += (targetScrollPercent - currentScrollPercent) * 0.1;
        currentParallax += (targetParallax - currentParallax) * 0.1;

        if (scrollBar) scrollBar.style.width = `${Math.max(0, Math.min(currentScrollPercent, 100))}%`;
        if (scrollStar) scrollStar.style.transform = `rotate(${currentScrollPercent * 3.6}deg)`;
        if (stars) stars.style.transform = `translate3d(0, -${currentParallax}px, 0)`;

        window.requestAnimationFrame(smoothScrollAnimation);
    }

    function updateScrollTargets() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        targetScrollPercent = (scrollTop / docHeight) * 100; targetParallax = (scrollTop / docHeight) * 30;
    }

    function initScrollEffects() {
        window.addEventListener("scroll", updateScrollTargets, { passive: true });
        window.addEventListener("resize", updateScrollTargets);
        updateScrollTargets(); smoothScrollAnimation();
    }

    function initFadeObserver() {
        const animateItems = $$(".timeline-item, .gallery-item");
        if (!animateItems.length) return;
        if (!("IntersectionObserver" in window)) { animateItems.forEach(item => item.classList.add("visible")); return; }

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("visible"); });
        }, { threshold: 0.15 });
        animateItems.forEach(item => observer.observe(item));
    }

    function initRandomMessage() {
        const msgElement = document.getElementById("random-message");
        if (msgElement) msgElement.innerText = loveMessages[Math.floor(Math.random() * loveMessages.length)];
    }

    function initWelcomeModal() {
        const welcomeModal = document.getElementById("welcome-modal");
        const hasSeenWelcome = safeStorage.get("memorySiteWelcomeSeen") === "true";
        if (welcomeModal && !hasSeenWelcome) {
            setTimeout(() => { welcomeModal.classList.add("show"); welcomeModal.setAttribute("aria-hidden", "false"); }, 900);
        }
    }

    function initBgmControls() {
        const audio = document.getElementById("myAudio");
        const volumeSlider = document.getElementById("bgm-volume");
        const muteIcon = document.getElementById("bgm-mute-icon");
        const player = document.getElementById("bgm-container");
        if (!audio) return;

        if (volumeSlider) {
            const initialVolume = Number(volumeSlider.value);
            audio.volume = Number.isFinite(initialVolume) ? initialVolume : 0.6;
            volumeSlider.addEventListener("input", event => {
                event.stopPropagation();
                audio.volume = Number.isFinite(Number(volumeSlider.value)) ? Number(volumeSlider.value) : 0.6;
                audio.muted = audio.volume === 0;
                if (muteIcon) muteIcon.className = audio.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
            });
        }
        audio.addEventListener("play", () => { document.body.classList.add("bgm-playing"); player?.classList.add("playing"); document.getElementById("bgm-icon")?.classList.add("rotating"); });
        audio.addEventListener("pause", () => { document.body.classList.remove("bgm-playing"); player?.classList.remove("playing"); document.getElementById("bgm-icon")?.classList.remove("rotating"); });
    }

    function initPasswordEnterKey() {
        document.getElementById("letter-password")?.addEventListener("keydown", event => { if (event.key === "Enter") checkPassword(); });
    }

    function initSlideshow() {
        const galleryItems = $$(".gallery-item");
        const dotsContainer = document.getElementById("slide-dots");
        if (!galleryItems.length || !dotsContainer) return;

        slides = galleryItems.map(item => {
            const img = item.querySelector("img");
            const fallback = img?.dataset.fallback || extractFallbackFromOnError(img?.getAttribute("onerror"));
            return {
                src: img?.getAttribute("src") || fallback, fallback,
                title: item.querySelector(".item-title")?.innerText || "우리의 순간",
                desc: item.querySelector(".item-desc")?.innerText || "소중한 기억"
            };
        });

        dotsContainer.innerHTML = "";
        slides.forEach((_, index) => {
            const dot = document.createElement("button"); dot.type = "button"; dot.className = "slide-dot";
            dot.setAttribute("aria-label", `${index + 1}번째 사진 보기`);
            dot.addEventListener("click", () => showSlide(index, true));
            dotsContainer.appendChild(dot);
        });

        showSlide(0); startSlideTimer();
        const frame = document.querySelector(".slideshow-frame");
        frame?.addEventListener("mouseenter", () => { if (!slidePauseLocked) { slidePaused = true; clearInterval(slideTimer); } });
        frame?.addEventListener("mouseleave", () => { if (!slidePauseLocked) { slidePaused = false; startSlideTimer(); } });
    }

    function initMobileNavActiveState() {
        const navLinks = $$(".mobile-nav a");
        const sections = ["home", "timeline", "gallery", "letter"].map(id => document.getElementById(id)).filter(Boolean);
        if (!navLinks.length || !sections.length) return;
        let ticking = false;

        function updateActiveByScroll() {
            ticking = false; const checkLine = window.scrollY + Math.min(window.innerHeight * 0.42, 360); let activeId = sections[0].id;
            for (const section of sections) {
                const nav = document.querySelector(".mobile-nav");
                const offset = (!nav || window.getComputedStyle(nav).display === "none") ? 0 : Math.ceil(nav.getBoundingClientRect().height + 18);
                if (checkLine >= (section.offsetTop - offset)) activeId = section.id;
            }
            navLinks.forEach(link => { link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`); });
        }
        window.addEventListener("scroll", () => { if (!ticking) { window.requestAnimationFrame(updateActiveByScroll); ticking = true; } }, { passive: true });
        updateActiveByScroll();
    }

    function initImageFallbacks() {
        $$('img[onerror]').forEach(img => {
            const fallback = extractFallbackFromOnError(img.getAttribute("onerror"));
            img.dataset.fallback = fallback; img.removeAttribute("onerror");
            img.addEventListener("error", function () { if (this.dataset.fallbackApplied !== "true") { this.dataset.fallbackApplied = "true"; this.src = fallback; } });
        });
    }

    function toggleMobileNav(event) {
        event?.preventDefault(); event?.stopPropagation();
        const nav = document.querySelector(".mobile-nav");
        const toggleBtn = document.querySelector(".mobile-nav-toggle");
        if (!nav || !toggleBtn) return;

        const isOpen = nav.classList.toggle("open"); toggleBtn.setAttribute("aria-expanded", String(isOpen));
        const icon = toggleBtn.querySelector("i"); if (icon) icon.className = isOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
    }

    function launchHeartFireworks(event) {
        const rect = event?.currentTarget?.getBoundingClientRect?.();
        const startX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const startY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        const hearts = ["❤", "♥", "✦", "✧", "💜", "💗"]; const colors = ["#ffffff", "#c7a4ff", "#ff8fd8", "#ffd1ec", "#b69cff"];
        const maxParticles = window.innerWidth < 768 ? 24 : 45; const fragment = document.createDocumentFragment();

        for (let i = 0; i < maxParticles; i++) {
            const particle = document.createElement("span"); particle.className = "heart-particle"; particle.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            const angle = Math.random() * Math.PI * 2; const distance = 90 + Math.random() * 190;
            const moveX = Math.cos(angle) * distance; const moveY = Math.sin(angle) * distance - 70; const size = 13 + Math.random() * 17; const duration = 950 + Math.random() * 800;

            particle.style.setProperty("--start-x", `${startX}px`); particle.style.setProperty("--start-y", `${startY}px`);
            particle.style.setProperty("--move-x", `${moveX}px`); particle.style.setProperty("--move-y", `${moveY}px`);
            particle.style.setProperty("--heart-size", `${size}px`); particle.style.setProperty("--heart-duration", `${duration}ms`);
            particle.style.setProperty("--rotate", `${Math.random() * 720 - 360}deg`); particle.style.setProperty("--heart-color", colors[Math.floor(Math.random() * colors.length)]);
            fragment.appendChild(particle); setTimeout(() => particle.remove(), duration + 100);
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

    function toggleThemePanel() { document.getElementById("theme-panel")?.classList.toggle("open"); }
    function readStorage(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function safeSet(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

    /* 🛠️ [기능 보완] 이름 분기 충돌 해결 통합 토스트 레이어 엔진 */
    function showEasterToast(message, duration = 3000) {
        const toast = document.getElementById("secret-toast");
        if (!toast) return;
        toast.innerHTML = message; toast.classList.add("show");
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.classList.remove("show"); }, duration);
    }
    // 하위 호환성 전용 내부 에일리어싱 고정
    const showSecretToast = showEasterToast;
    const showMiniToast = showEasterToast;

    function burstAt(element, repeat = 1) {
        const target = element || document.querySelector(".intro-content") || document.body;
        for (let i = 0; i < repeat; i++) { setTimeout(() => { launchHeartFireworks({ currentTarget: target }); }, i * 260); }
    }

    function ensureConstellationLayer() {
        let layer = document.getElementById("subtitle-constellation-easter"); if (layer) return layer;
        layer = document.createElement("div"); layer.id = "subtitle-constellation-easter"; layer.className = "subtitle-constellation-easter"; layer.setAttribute("aria-hidden", "true");
        layer.innerHTML = `
            <div class="constellation-card" onclick="event.stopPropagation()">
                <svg width="220" height="150" viewBox="0 0 220 150">
                    <line x1="30" y1="40" x2="85" y2="25" stroke="rgba(199,164,255,0.4)" stroke-width="1.5"/>
                    <line x1="85" y1="25" x2="140" y2="65" stroke="rgba(199,164,255,0.4)" stroke-width="1.5"/>
                    <line x1="140" y1="65" x2="190" y2="110" stroke="rgba(199,164,255,0.4)" stroke-width="1.5"/>
                    <circle cx="30" cy="40" r="4.5" fill="#fff"/><circle cx="85" cy="25" r="5" fill="#ffd1ec"/>
                    <circle cx="140" cy="65" r="4.5" fill="#fff"/><circle cx="190" cy="110" r="5.5" fill="#c7a4ff"/>
                </svg>
                <h4>카시오페아의 속삭임</h4><p>우리의 날짜를 지켜보는 밤하늘의 네 번째 별빛 테마야.</p>
                <button type="button" onclick="window.hideSubtitleConstellationEaster()">숨기기</button>
            </div>`;
        layer.addEventListener("click", () => layer.classList.remove("show"));
        document.body.appendChild(layer); return layer;
    }

    function initEasterEggsSystem() {
        document.querySelector(".sub-title")?.addEventListener("click", () => { ensureConstellationLayer().classList.add("show"); showEasterToast("🌌 부드러운 성좌의 비밀을 찾았어!", 2800); burstAt(document.querySelector(".sub-title"), 1); });
        
        const longPressStart = (e) => { if (e.type === "mousedown" && e.button !== 0) return; clearTimeout(longPressTimer); longPressTimer = setTimeout(() => { document.body.classList.add("theme-our-night"); safeSet("memorySiteHiddenTheme", "our-night"); showEasterToast("🎆 <strong>히든 테마 [우리의 밤]</strong> 플레이어가 활성화되었어!", 3500); burstAt(null, 3); }, LONG_PRESS_MS); };
        const longPressEnd = () => clearTimeout(longPressTimer);
        $$(".welcome-icon, .theme-toggle-btn").forEach(el => { el.addEventListener("mousedown", longPressStart); el.addEventListener("touchstart", longPressStart, { passive: true }); ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(t => el.addEventListener(t, longPressEnd)); });

        /* 🛠️ [기능 복원] bgmDiskClickCount 명칭 교정 및 버그 완벽 패치 */
        document.querySelector(".bgm-main-btn")?.addEventListener("click", () => {
            bgmSecretClickCount += 1; clearTimeout(initEasterEggsSystem._btnTimer);
            initEasterEggsSystem._btnTimer = setTimeout(() => { bgmSecretClickCount = 0; }, 3000);
            if (bgmSecretClickCount >= 7) { bgmSecretClickCount = 0; document.body.classList.add("bgm-playing"); showEasterToast("✨ 별빛 증폭 모드가 잠깐 켜졌어.", 2800); setTimeout(() => { const audio = document.getElementById("myAudio"); if (!audio || audio.paused) document.body.classList.remove("bgm-playing"); }, 4500); }
        });

        document.querySelector("footer")?.addEventListener("click", () => { footerClickCount += 1; if (footerClickCount === 4) { showEasterToast("⭐ 엇! 발자국 소리에 밤하늘이 흔들려 (2번 더..)", 2400); } else if (footerClickCount >= 6) { footerClickCount = 0; if (!footerRewardShown) { footerRewardShown = true; showEasterToast("🎁 <em>To be continued...</em> 밤이 지나도 추억은 영원히.", 4500); burstAt(document.querySelector("footer"), 2); } } });

        document.addEventListener("keydown", event => {
            if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
            const k = event.key.toLowerCase(); typedSecretBuffer = (typedSecretBuffer + k).slice(-12);
            if (typedSecretBuffer.includes("haeun") || typedSecretBuffer.includes("하은")) { typedSecretBuffer = ""; showEasterToast("💝 넌 언제나 내 밤하늘에서 가장 밝게 빛나는 별이야.", 3600); burstAt(null, 2); }
            if (/[0-9]/.test(k)) { dateBuffer = (dateBuffer + k).slice(-4); if (dateBuffer === "0416") { dateBuffer = ""; showEasterToast("📅 0416, 우리의 첫 페이지가 시작된 소중한 기적.", 3600); burstAt(null, 2); } }
        });

        document.querySelector(".main-title")?.addEventListener("click", () => { titleClickCount += 1; if (titleClickCount >= 5) { titleClickCount = 0; document.getElementById("easter-secret")?.classList.add("revealed"); showEasterToast("🌌 숨겨진 별빛 기록이 열렸어!", 3200); launchHeartFireworks({ currentTarget: document.querySelector(".main-title") }); } });
    }

    function initBackToTopStar() {
        if (document.getElementById("back-to-top-star")) return;
        const button = document.createElement("button"); button.id = "back-to-top-star"; button.className = "back-to-top-star"; button.type = "button"; button.innerHTML = '<i class="fa-solid fa-star"></i>'; document.body.appendChild(button);
        button.onclick = () => { window.scrollTo({ top: 0, behavior: "smooth" }); };
        window.addEventListener("scroll", () => { button.classList.toggle("show", window.scrollY > 480); }, { passive: true });
    }

    function initImageSkeletons() {
        $$(".image-wrapper img, .item-image img, #slide-image").forEach(img => {
            const container = img.closest(".image-wrapper, .item-image, .slide-image-wrap"); if (!container) return;
            container.classList.add("memory-img-skeleton");
            const loaded = () => container.classList.add("memory-img-loaded");
            if (img.complete && img.naturalWidth > 0) loaded(); else img.addEventListener("load", loaded, { once: true });
        });
    }

    function initTimeGreeting() {
        if (document.getElementById("memory-time-greeting")) return;
        const hour = new Date().getHours(); let icon = "fa-moon"; let msg = "밤하늘이 예쁜 시간이야. 천천히 우리의 기록장을 둘러봐.";
        if (hour >= 5 && hour < 11) { icon = "fa-sun"; msg = "좋은 아침이야. 오늘도 우리의 이야기가 조용히 빛나고 있어."; } 
        else if (hour >= 11 && hour < 17) { icon = "fa-cloud-sun"; msg = "햇살이 머무는 시간이야. 오늘의 기록도 따뜻하기를."; } 
        else if (hour >= 17 && hour < 21) { icon = "fa-star-half-stroke"; msg = "노을이 내려앉는 시간이야. 우리의 순간들도 예쁘게 남아 있어."; }

        const greeting = document.createElement("p"); greeting.id = "memory-time-greeting"; greeting.className = "memory-time-greeting"; greeting.innerHTML = `<i class="fa-solid ${icon}"></i>${msg}`;
        const target = document.getElementById("random-message") || document.getElementById("visit-count");
        if (target) target.insertAdjacentElement(target.id === "random-message" ? "afterend" : "beforebegin", greeting);
    }

    function initBgmVolumeMemory() {
        const audio = document.getElementById("myAudio"); const volumeSlider = document.getElementById("bgm-volume");
        if (!audio || !volumeSlider) return;
        const savedVolume = safeStorage.get("memorySiteBgmVolume"); if (savedVolume !== null) { audio.volume = parseFloat(savedVolume); volumeSlider.value = savedVolume; }
        if (safeStorage.get("memorySiteBgmMuted") === "true") audio.muted = true;

        const saveVol = () => { safeStorage.set("memorySiteBgmVolume", String(audio.volume)); safeStorage.set("memorySiteBgmMuted", audio.muted ? "true" : "false"); const icon = document.getElementById("bgm-mute-icon"); if (icon) icon.className = audio.muted || audio.volume === 0 ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high"; };
        volumeSlider.addEventListener("input", saveVol); audio.addEventListener("volumechange", saveVol); saveVol();
    }

    function initEndingCompleteBadge() {
        const credits = document.getElementById("ending-credits"); if (!credits) return;
        const handle = () => { if (credits.classList.contains("ended") && !document.getElementById("ending-complete-badge")) { const b = document.createElement("p"); b.id = "ending-complete-badge"; b.className = "ending-complete-badge"; b.innerHTML = '<i class="fa-solid fa-award"></i>엔딩까지 함께한 사람'; document.querySelector(".intro-content")?.appendChild(b); document.body.classList.add("has-ending-complete-badge"); safeStorage.set("memorySiteEndingCompleteBadge", "true"); } };
        new MutationObserver(handle).observe(credits, { attributes: true, attributeFilter: ["class"] });
        if (safeStorage.get("memorySiteEndingCompleteBadge") === "true") { document.body.classList.add("has-ending-complete-badge"); setTimeout(() => { if (!document.getElementById("ending-complete-badge")) { const b = document.createElement("p"); b.id = "ending-complete-badge"; b.className = "ending-complete-badge"; b.innerHTML = '<i class="fa-solid fa-award"></i>엔딩까지 함께한 사람'; document.querySelector(".intro-content")?.appendChild(b); } }, 600); }
    }

    function initEndingCreditsObserver() {
        const credits = document.getElementById("ending-credits"); if (!credits || !("IntersectionObserver" in window)) return;
        const observer = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting && credits.dataset.creditsStarted !== "playing" && !credits.classList.contains("ended")) { startEndingCreditsRoll(); observer.unobserve(credits); } }); }, { threshold: window.innerWidth < 768 ? 0.15 : 0.28 });
        observer.observe(credits);
    }

    function startEndingCreditsRoll() {
        const credits = document.getElementById("ending-credits"); const roll = document.getElementById("credits-roll"); const mask = document.querySelector(".credits-mask"); if (!credits || !roll || !mask) return;
        clearTimeout(endingFinishTimer); credits.classList.add("resetting"); credits.classList.remove("play", "ended"); document.getElementById("credits-final-message")?.setAttribute("aria-hidden", "true"); void roll.offsetHeight; credits.classList.remove("resetting");

        credits.classList.add("play"); credits.dataset.creditsStarted = "playing";
        const durationMs = (parseFloat(getComputedStyle(mask).getPropertyValue("--credits-duration")) || 64) * 1000;
        endingFinishTimer = setTimeout(() => { credits.classList.remove("play"); credits.classList.add("ended"); credits.dataset.creditsStarted = "ended"; const msg = document.getElementById("credits-final-message"); if (msg) { msg.setAttribute("aria-hidden", "false"); msg.style.opacity = "1"; msg.style.visibility = "visible"; } }, durationMs);
        if (!endingFireworkPlayed) { endingFireworkPlayed = true; setTimeout(() => { burstAt(roll, 1); }, 800); }
    }

    function initSeasonalEffects() {
        const layer = document.getElementById("seasonal-effect-layer"); if (!layer) return;
        const month = new Date().getMonth() + 1; let season = "winter"; let symbols = ["❄", "✦", "❅"]; let count = 26;
        if (month >= 3 && month <= 5) { season = "spring"; symbols = ["❀", "✿", "♡", "✦"]; count = 24; } 
        else if (month >= 6 && month <= 8) { season = "summer"; symbols = ["🫧", "✨", "🫧"]; count = 20; } 
        else if (month >= 9 && month <= 11) { season = "autumn"; symbols = ["🍁", "🍂", "✦"]; count = 22; }

        document.body.classList.add(`season-${season}`); const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const p = document.createElement("span"); p.className = "seasonal-particle"; p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            p.style.setProperty("--season-left", `${Math.random() * 100}vw`); p.style.setProperty("--season-size", `${Math.random() * 12 + 10}px`); p.style.setProperty("--season-opacity", `${Math.random() * 0.4 + 0.25}`);
            p.style.setProperty("--season-duration", `${Math.random() * 6 + 7}s`); p.style.setProperty("--season-delay", `${Math.random() * -12}s`); p.style.setProperty("--season-drift", `${Math.random() * 140 - 70}px`); p.style.setProperty("--season-rotate", `${Math.random() * 360}deg`);
            fragment.appendChild(p);
        }
        layer.appendChild(fragment);
    }

    function changeSlide(direction) { showSlide(slideIndex + direction, true); }
    function showSlide(index, resetTimer = false) {
        if (!slides.length) return; slideIndex = (index + slides.length) % slides.length;
        const s = slides[slideIndex]; const img = document.getElementById("slide-image");
        if (img) { img.classList.remove("show"); setTimeout(() => { setSafeImage(img, s.src, s.fallback, s.title); img.classList.add("show"); }, 120); }
        setText("slide-title", s.title); setText("slide-desc", s.desc);
        $$(".slide-dot").forEach((d, i) => d.classList.toggle("active", i === slideIndex));
        if (resetTimer) startSlideTimer();
    }
    function startSlideTimer() { if (!slidePaused && !slidePauseLocked) { clearInterval(slideTimer); slideTimer = setInterval(() => { showSlide(slideIndex + 1); }, 3500); } }

    function toggleSlidePause() {
        const btn = document.getElementById("slide-pause-btn"); slidePauseLocked = !slidePauseLocked; slidePaused = slidePauseLocked;
        if (slidePauseLocked) { clearInterval(slideTimer); if (btn) { btn.setAttribute("aria-pressed", "true"); btn.classList.add("paused"); btn.querySelector("span").innerText = "슬라이드 다시 재생"; btn.querySelector("i").className = "fa-solid fa-play"; } } 
        else { startSlideTimer(); if (btn) { btn.setAttribute("aria-pressed", "false"); btn.classList.remove("paused"); btn.querySelector("span").innerText = "슬라이드 일시정지"; btn.querySelector("i").className = "fa-solid fa-pause"; } }
    }

    function initMobileNavClickAndResize() {
        $$(".mobile-nav-links a").forEach(link => {
            link.addEventListener("click", event => {
                document.querySelector(".mobile-nav")?.classList.remove("open");
                const icon = document.querySelector(".mobile-nav-toggle i"); if (icon) icon.className = "fa-solid fa-bars";
                const target = document.getElementById(link.getAttribute("href")?.replace("#", ""));
                if (target) { event.preventDefault(); window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" }); }
            });
        });
        document.addEventListener("click", e => { if (!e.target.closest(".mobile-nav")) { document.querySelector(".mobile-nav")?.classList.remove("open"); const icon = document.querySelector(".mobile-nav-toggle i"); if (icon) icon.className = "fa-solid fa-bars"; } });
    }

    function initUpdateNotice() {
        if (document.getElementById("memory-update-notice")) return;
        const notice = document.createElement("p"); notice.id = "memory-update-notice"; notice.className = "memory-update-notice"; notice.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i>${SITE_UPDATE_TEXT}`;
        const timeGreeting = document.getElementById("memory-time-greeting") || document.getElementById("visit-count");
        if (timeGreeting) timeGreeting.insertAdjacentElement("afterend", notice);
    }

    function init() {
        initSiteSecurity();
        const savedVisit = safeStorage.get("memorySiteVisitCount") || "0"; const newVisit = parseInt(savedVisit, 10) + 1; safeStorage.set("memorySiteVisitCount", String(newVisit));
        setText("visit-count", `★ 네가 이 기록장에 찾아온 건 ${newVisit}번째야.`);
        if (readStorage("memorySiteMaintenanceModeActive") === "true") { document.getElementById("maintenance-screen")?.classList.add("show"); document.documentElement.classList.add("maintenance-mode-active"); }

        initLightbox(); updateDday(); setInterval(updateDday, 1000); initScrollEffects(); initFadeObserver(); initSlideshow();
        initMobileNavActiveState(); initMobileNavClickAndResize();
        $$(".theme-options button").forEach(btn => btn.addEventListener("click", () => setSiteTheme(btn.dataset.theme)));
        document.querySelector(".theme-toggle-btn")?.addEventListener("click", e => { e.stopPropagation(); toggleThemePanel(); });
        if (readStorage("memorySiteHiddenTheme") === "our-night") document.body.classList.add("theme-our-night");

        initEasterEggsSystem(); initSeasonalEffects(); initEndingCreditsObserver(); initRandomMessage(); initWelcomeModal(); initBgmControls(); initPasswordEnterKey(); initImageFallbacks();
        document.addEventListener("mousemove", e => createStar(e.clientX, e.clientY), { passive: true });
        document.addEventListener("touchmove", e => { const t = e.touches?.[0]; if (t) createStar(t.clientX, t.clientY); }, { passive: true });
        $$(".mobile-nav-toggle").forEach(btn => btn.addEventListener("click", toggleMobileNav));
    }

    function initExtraSafeFeatures() { initBackToTopStar(); initImageSkeletons(); initTimeGreeting(); initUpdateNotice(); initEndingCompleteBadge(); initBgmVolumeMemory(); }

    window.toggleBGM = toggleBGM; window.toggleMute = toggleMute; window.checkPassword = checkPassword; window.openReplyBox = openReplyBox; window.closeReplyBox = closeReplyBox; window.sendReply = sendReply; window.closeLightbox = closeLightbox; window.closeWelcomeModal = closeWelcomeModal; window.launchHeartFireworks = launchHeartFireworks; window.setSiteTheme = setSiteTheme; window.toggleThemePanel = toggleThemePanel; window.changeSlide = changeSlide; window.toggleSlidePause = toggleSlidePause;
    window.hideEasterSecret = () => document.getElementById("easter-secret")?.classList.remove("revealed");
    window.hideSubtitleConstellationEaster = () => document.getElementById("subtitle-constellation-easter")?.classList.remove("show");
    window.restartEndingCredits = () => { const c = document.getElementById("ending-credits"); if (c) { c.dataset.creditsStarted = "none"; c.classList.remove("ended"); startEndingCreditsRoll(); showEasterToast("🎬 엔딩 크레딧을 처음부터 다시 재생할게.", 2200); } };

    window.addEventListener("load", hideLoadingScreen, { once: true }); setTimeout(hideLoadingScreen, LOADING_MAX_VISIBLE_MS);
    runWhenReady(init); runWhenReady(initExtraSafeFeatures);
})();
