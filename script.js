(() => {
    "use strict";

    if (window.__memorySiteFinalScriptLoaded) return;
    window.__memorySiteFinalScriptLoaded = true;

    // =========================================
    // 1. 공통 설정 및 글로벌 변수
    // =========================================
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
    const SITE_UPDATE_TEXT = "마지막 업데이트 : 2026.05.20 09:30";

    const STORAGE_KEYS = {
        bgmVolume: "memorySiteBgmVolume",
        bgmMuted: "memorySiteBgmMuted",
        endingBadge: "memorySiteEndingCompleteBadge",
        heartClicks: "memorySiteHeartClicks",
        hiddenTheme: "memorySiteHiddenTheme"
    };

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
    let currentScrollPercent = 0;
    let targetScrollPercent = 0;
    let currentParallax = 0;
    let targetParallax = 0;
    let heartClickCount = 0;
    let longPressTimer = null;

    // DOM 캐싱 (성능 최적화)
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const scrollBar = document.getElementById("scroll-bar");
    const scrollStar = document.getElementById("scroll-star");
    const starsLayer = document.querySelector(".stars");
    const loadingScreen = document.getElementById("loading-screen");
    const secretToast = document.getElementById("secret-toast");
    const myAudio = document.getElementById("myAudio");

    const safeStorage = {
        get(key) { try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (e) { return null; } },
        set(key, value) { try { if (window.localStorage) window.localStorage.setItem(key, value); } catch (e) {} }
    };

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.innerText = value;
    }

    // =========================================
    // 2. 화면 로딩 및 팝업 제어
    // =========================================
    function hideLoadingScreen() {
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

    function initWelcomeModal() {
        const welcomeModal = document.getElementById("welcome-modal");
        if (welcomeModal && safeStorage.get("memorySiteWelcomeSeen") !== "true") {
            setTimeout(() => {
                welcomeModal.classList.add("show");
                welcomeModal.setAttribute("aria-hidden", "false");
            }, 900);
        }
    }

    window.closeWelcomeModal = function() {
        const modal = document.getElementById("welcome-modal");
        if (!modal) return;
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        safeStorage.set("memorySiteWelcomeSeen", "true");
    };

    // =========================================
    // 3. BGM 및 사운드 컨트롤
    // =========================================
    window.toggleBGM = function() {
        if (!myAudio) return;
        const icon = document.getElementById("bgm-icon");
        const player = document.getElementById("bgm-container");

        if (myAudio.paused) {
            myAudio.play().then(() => {
                icon?.classList.add("rotating");
                player?.classList.add("playing");
                document.body.classList.add("bgm-playing");
            }).catch(() => alert("음원을 재생할 수 없어! 기기의 소리 설정이나 절전 모드를 확인해줘 🥺"));
        } else {
            myAudio.pause();
            icon?.classList.remove("rotating");
            player?.classList.remove("playing");
            document.body.classList.remove("bgm-playing");
        }
    };

    window.toggleMute = function(event) {
        event?.stopPropagation();
        if (!myAudio) return;
        const muteIcon = document.getElementById("bgm-mute-icon");
        myAudio.muted = !myAudio.muted;
        if (muteIcon) muteIcon.className = myAudio.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
    };

    function initBgmVolumeMemory() {
        const volumeSlider = document.getElementById("bgm-volume");
        const muteIcon = document.getElementById("bgm-mute-icon");
        if (!myAudio || !volumeSlider) return;

        const savedVolume = Number(safeStorage.get(STORAGE_KEYS.bgmVolume));
        if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
            myAudio.volume = savedVolume;
            volumeSlider.value = String(savedVolume);
        }

        const savedMuted = safeStorage.get(STORAGE_KEYS.bgmMuted);
        if (savedMuted === "true") myAudio.muted = true;
        else if (savedMuted === "false") myAudio.muted = false;

        function updateMuteIcon() {
            if (muteIcon) muteIcon.className = myAudio.muted || myAudio.volume === 0 ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
        }

        function saveCurrentVolume() {
            safeStorage.set(STORAGE_KEYS.bgmVolume, String(myAudio.volume));
            safeStorage.set(STORAGE_KEYS.bgmMuted, String(myAudio.muted));
            volumeSlider.classList.add("memory-volume-saved");
            clearTimeout(volumeSlider._volumeSaveTimer);
            volumeSlider._volumeSaveTimer = setTimeout(() => volumeSlider.classList.remove("memory-volume-saved"), 650);
            updateMuteIcon();
        }

        volumeSlider.addEventListener("input", () => {
            const vol = Number(volumeSlider.value);
            if (Number.isFinite(vol)) { myAudio.volume = vol; myAudio.muted = vol === 0; saveCurrentVolume(); }
        });
        myAudio.addEventListener("volumechange", () => { volumeSlider.value = String(myAudio.volume); saveCurrentVolume(); });
        
        myAudio.addEventListener("play", () => { document.body.classList.add("bgm-playing"); });
        myAudio.addEventListener("pause", () => { document.body.classList.remove("bgm-playing"); });
        myAudio.addEventListener("ended", () => { document.body.classList.remove("bgm-playing"); });
        updateMuteIcon();
    }

    // =========================================
    // 4. 비밀 번호 및 보안 전송 (SHA-256 해시 호환)
    // =========================================
    async function sha256(text) {
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
            const data = new TextEncoder().encode(text);
            const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
        }
        return text;
    }

    window.checkPassword = async function() {
        const inputElement = document.getElementById("letter-password");
        const lockScreen = document.getElementById("lock-screen");
        const realContent = document.getElementById("letter-real-content");
        const letterTextDiv = document.querySelector(".letter-text");
        const replyBtn = document.getElementById("reply-btn");
        const submitBtn = document.querySelector(".password-field button");

        if (!inputElement || !lockScreen) return;

        const savedPasswordHash = "adfaab87038c95002ab05463e743201605457409b7129f9a3a8cddcb8caea1a2";
        const inputHash = await sha256(inputElement.value || "");

        if (inputElement.value === "0416" || inputHash === savedPasswordHash) {
            if (submitBtn) submitBtn.disabled = true;
            lockScreen.style.display = "none";
            realContent.style.display = "block";
            realContent.classList.add("unlocked");
            replyBtn.classList.remove("is-visible");

            const originalHTML = letterTextDiv.innerHTML;
            letterTextDiv.innerHTML = "";

            setTimeout(() => {
                let i = 0, currentHTML = "";
                const tokens = originalHTML.match(/<[^>]+>|[^<]/g) || [];
                function type() {
                    if (i < tokens.length) {
                        currentHTML += tokens[i++];
                        letterTextDiv.innerHTML = currentHTML;
                        setTimeout(type, Math.max(4, 18 + (Math.random() * 16 - 8)));
                    } else {
                        replyBtn.classList.add("is-visible");
                        replyBtn.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 800, fill: "forwards" });
                    }
                }
                type();
            }, 600);
        } else {
            alert("비밀번호가 틀렸어! 우리의 소중한 날짜를 입력해줘.");
            inputElement.value = "";
            inputElement.focus();
        }
    };

    window.openReplyBox = () => document.getElementById("reply-modal")?.classList.add("show");
    window.closeReplyBox = () => document.getElementById("reply-modal")?.classList.remove("show");
    
    window.sendReply = function() {
        const replyText = document.getElementById("reply-text");
        const text = replyText?.value || "";

        if (text.trim() === "") {
            alert("내용을 조금이라도 적어줘! 🥺");
            return;
        }

        const myEmail = "atritime@gmail.com";
        const subject = encodeURIComponent("[우리의 기록장] 사이트에서 누군가 보낸 답장이야.");
        const body = encodeURIComponent(text);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                alert("우리의 기록장에 편지가 잘 남겨졌어! 고마워 ❤️\n(혹시 메일 앱이 자동으로 열리지 않는다면, 내용이 복사되었으니 직접 메일로 붙여넣어줘!)");
                window.location.href = `mailto:${myEmail}?subject=${subject}&body=${body}`;
                window.closeReplyBox();
                replyText.value = "";
            }).catch(() => {
                window.location.href = `mailto:${myEmail}?subject=${subject}&body=${body}`;
                window.closeReplyBox();
            });
        } else {
            window.location.href = `mailto:${myEmail}?subject=${subject}&body=${body}`;
            window.closeReplyBox();
        }
    };

    // =========================================
    // 5. 슬라이드쇼 및 갤러리 라이트박스
    // =========================================
    function setSafeImage(img, src, fallback = DEFAULT_FALLBACK_IMAGE, alt = "") {
        if (!img) return;
        img.onerror = function () {
            if (this.dataset.fallbackApplied === "true") return;
            this.dataset.fallbackApplied = "true";
            this.src = fallback;
        };
        if (alt) img.alt = alt;
        img.dataset.fallbackApplied = "false";
        img.src = src || fallback;
    }

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
            }, 100);
        }
        if (slideTitle) slideTitle.innerText = currentSlide.title;
        if (slideDesc) slideDesc.innerText = currentSlide.desc;

        $$(".slide-dot").forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === slideIndex));
        if (resetTimer) startSlideTimer();
    }

    window.changeSlide = function(direction) { showSlide(slideIndex + direction, true); };
    
    function startSlideTimer() {
        if (slidePaused || slidePauseLocked) return;
        if (slideTimer) clearInterval(slideTimer);
        slideTimer = setInterval(() => showSlide(slideIndex + 1), 3500);
    }

    function setSlidePaused(paused, lock = false) {
        if (lock) slidePauseLocked = paused;
        slidePaused = paused;
        if (paused) clearInterval(slideTimer); else if (!slidePauseLocked) startSlideTimer();

        const btn = document.getElementById("slide-pause-btn");
        if (btn) {
            const isPaused = slidePaused || slidePauseLocked;
            btn.classList.toggle("paused", isPaused);
            btn.querySelector("i").className = isPaused ? "fa-solid fa-play" : "fa-solid fa-pause";
            btn.querySelector("span").innerText = isPaused ? "슬라이드 다시 재생" : "슬라이드 일시정지";
        }
    }

    window.toggleSlidePause = () => setSlidePaused(!slidePauseLocked, true);

    function initSlideshow() {
        const galleryItems = $$(".gallery-item");
        const dotsContainer = document.getElementById("slide-dots");
        if (!galleryItems.length || !dotsContainer) return;

        slides = galleryItems.map(item => {
            const img = item.querySelector("img");
            return {
                src: img?.getAttribute("src") || DEFAULT_FALLBACK_IMAGE,
                fallback: img?.dataset.fallback || DEFAULT_FALLBACK_IMAGE,
                title: item.querySelector(".item-title")?.innerText || "우리의 순간",
                desc: item.querySelector(".item-desc")?.innerText || "소중한 기억"
            };
        });

        dotsContainer.innerHTML = "";
        const fragment = document.createDocumentFragment();
        slides.forEach((_, index) => {
            const dot = document.createElement("button");
            dot.className = "slide-dot";
            dot.addEventListener("click", () => showSlide(index, true));
            fragment.appendChild(dot);
        });
        dotsContainer.appendChild(fragment);

        showSlide(0); startSlideTimer();

        const slideshow = document.getElementById("slideshow");
        slideshow?.addEventListener("mouseenter", () => { if (!slidePauseLocked) setSlidePaused(true, false); });
        slideshow?.addEventListener("mouseleave", () => { if (!slidePauseLocked) setSlidePaused(false, false); });
    }

    window.closeLightbox = function(event) {
        if (event && event.target.id !== "lightbox" && !event.target.classList.contains("close-lightbox")) return;
        document.getElementById("lightbox")?.classList.remove("show");
        document.body.classList.remove("lightbox-open");
    };

    function initLightbox() {
        $$(".item-image img").forEach(img => {
            img.style.cursor = "pointer";
            img.addEventListener("click", (e) => {
                e.preventDefault(); e.stopPropagation();
                const item = img.closest(".gallery-item");
                const title = item?.querySelector(".item-title")?.innerText || "";
                const desc = item?.querySelector(".item-desc")?.innerText || "";
                
                const lbImg = document.getElementById("lightbox-img");
                setSafeImage(lbImg, img.src, DEFAULT_FALLBACK_IMAGE, title);
                setText("lightbox-title", title);
                setText("lightbox-desc", desc);
                
                document.getElementById("lightbox")?.classList.add("show");
                document.body.classList.add("lightbox-open");
            });
        });
        document.addEventListener("keydown", e => { if (e.key === "Escape") window.closeLightbox(); });
    }

    // =========================================
    // 6. 스크롤 인터랙션 및 디데이 (GPU 최적화)
    // =========================================
    function updateDday() {
        const startDate = new Date("2026-04-16T00:00:00").getTime();
        const now = Date.now();
        let distance = now - startDate;
        const labelElement = document.querySelector(".d-day-label");

        if (distance < 0) {
            if (labelElement) labelElement.innerText = "우리의 이야기가 시작되기까지";
            distance = startDate - now;
        } else if (labelElement) {
            labelElement.innerText = "우리의 이야기가 시작된 지";
        }

        setText("days", String(Math.floor(distance / (1000 * 60 * 60 * 24))));
        setText("hours", String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, "0"));
        setText("minutes", String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0"));
        setText("seconds", String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, "0"));
    }

    function smoothScrollAnimation() {
        currentScrollPercent += (targetScrollPercent - currentScrollPercent) * 0.12;
        currentParallax += (targetParallax - currentParallax) * 0.12;
        
        // GPU 레이어 가속을 유도하는 3D 변형 적용으로 부드러움 극대화
        if (scrollBar) scrollBar.style.width = `${Math.max(0, Math.min(currentScrollPercent, 100))}%`;
        if (scrollStar) scrollStar.style.transform = `translate3d(-50%, 0, 0) rotate(${currentScrollPercent * 3.6}deg)`;
        if (starsLayer) starsLayer.style.transform = `translate3d(0, -${currentParallax}px, 0)`;
        
        window.requestAnimationFrame(smoothScrollAnimation);
    }

    function initScrollEffects() {
        let docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        
        window.addEventListener("resize", () => {
            docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        }, { passive: true });

        window.addEventListener("scroll", () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            targetScrollPercent = (scrollTop / docHeight) * 100;
            targetParallax = (scrollTop / docHeight) * 35;
        }, { passive: true });

        window.requestAnimationFrame(smoothScrollAnimation);
    }

    function initFadeObserver() {
        const items = $$(".timeline-item, .gallery-item");
        if (!("IntersectionObserver" in window)) { items.forEach(i => i.classList.add("visible")); return; }
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); } });
        }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
        items.forEach(i => observer.observe(i));
    }

    // =========================================
    // 7. 모바일 메뉴 및 전역 테마 제어
    // =========================================
    window.toggleMobileNav = (e) => {
        e?.preventDefault(); e?.stopPropagation();
        const nav = document.querySelector(".mobile-nav");
        const icon = document.querySelector(".mobile-nav-toggle i");
        if (!nav) return;
        const isOpen = nav.classList.toggle("open");
        if (icon) icon.className = isOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
    };

    function closeMobileNav() {
        document.querySelector(".mobile-nav")?.classList.remove("open");
        const icon = document.querySelector(".mobile-nav-toggle i");
        if (icon) icon.className = "fa-solid fa-bars";
    }

    function initMobileNav() {
        $$(".mobile-nav a").forEach(link => {
            link.addEventListener("click", e => {
                closeMobileNav();
                const targetId = link.getAttribute("href")?.replace("#", "");
                const target = targetId ? document.getElementById(targetId) : null;
                if (!target) return;
                e.preventDefault();
                window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
            });
        });
        document.addEventListener("click", e => { if (!e.target.closest(".mobile-nav")) closeMobileNav(); });
    }

    window.toggleThemePanel = () => document.getElementById("theme-panel")?.classList.toggle("open");
    
    window.setSiteTheme = function(themeName) {
        const safeTheme = SITE_THEMES.includes(themeName) ? themeName : "night";
        document.body.classList.remove("theme-cherry", "theme-ocean", "theme-letter", "theme-our-night");
        if (safeTheme !== "night") document.body.classList.add(`theme-${safeTheme}`);
        safeStorage.set("memorySiteTheme", safeTheme);
        $$(".theme-options button").forEach(b => b.classList.toggle("active", b.dataset.theme === safeTheme));
    };

    // =========================================
    // 8. 특수 파티클 및 스켈레톤, 방문자 기능
    // =========================================
    let lastStarTime = 0;
    function createStar(x, y) {
        const now = Date.now();
        if (now - lastStarTime < 45) return; // 모바일 터치 피로도 완화를 위한 쓰로틀링
        lastStarTime = now;

        const star = document.createElement("div");
        star.className = "mouse-star";
        star.style.left = `${x + (Math.random() - 0.5) * 12}px`;
        star.style.top = `${y + (Math.random() - 0.5) * 12}px`;
        const size = Math.random() * 5 + 6;
        star.style.width = `${size}px`; star.style.height = `${size}px`;
        document.body.appendChild(star);
        setTimeout(() => star.remove(), 950);
    }

    window.launchHeartFireworks = function(event) {
        const rect = event?.currentTarget?.getBoundingClientRect?.();
        const startX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const startY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        const hearts = ["❤", "♥", "✦", "✧", "💜", "💗"];
        const colors = ["#ffffff", "#c7a4ff", "#ff8fd8", "#ffd1ec", "#b69cff"];
        const maxParticles = window.innerWidth < 768 ? 26 : 45; // 모바일 과부하 방지 개수 조절

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < maxParticles; i++) {
            const p = document.createElement("span");
            p.className = "heart-particle"; p.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            const angle = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 180;
            const dur = 900 + Math.random() * 700;
            p.style.setProperty("--start-x", `${startX}px`);
            p.style.setProperty("--start-y", `${startY}px`);
            p.style.setProperty("--move-x", `${Math.cos(angle) * dist}px`);
            p.style.setProperty("--move-y", `${Math.sin(angle) * dist - 60}px`);
            p.style.setProperty("--heart-size", `${12 + Math.random() * 15}px`);
            p.style.setProperty("--heart-duration", `${dur}ms`);
            p.style.setProperty("--rotate", `${Math.random() * 480 - 240}deg`);
            p.style.setProperty("--heart-color", colors[Math.floor(Math.random() * colors.length)]);
            fragment.appendChild(p);
            setTimeout(() => p.remove(), dur + 100);
        }
        document.body.appendChild(fragment);
    };

    function showSecretToast(msg, dur = 2800) {
        if (!secretToast) return;
        secretToast.innerHTML = msg; secretToast.classList.add("show");
        clearTimeout(secretToastTimer);
        secretToastTimer = setTimeout(() => secretToast.classList.remove("show"), dur);
    }

    function initExtraFeatures() {
        $$(".image-wrapper img, .item-image img, #slide-image").forEach(img => {
            const wrap = img.closest(".image-wrapper, .item-image, .slide-image-wrap");
            if (!wrap) return;
            wrap.classList.add("memory-img-skeleton");
            const markLoaded = () => wrap.classList.add("memory-img-loaded");
            if (img.complete && img.naturalWidth > 0) markLoaded(); else img.addEventListener("load", markLoaded, { once: true });
        });

        const topBtn = document.createElement("button");
        topBtn.className = "back-to-top-star"; topBtn.innerHTML = '<i class="fa-solid fa-star"></i>';
        document.body.appendChild(topBtn);
        topBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
        window.addEventListener("scroll", () => topBtn.classList.toggle("show", window.scrollY > 500), { passive: true });

        const visitCount = Number(safeStorage.get("memorySiteVisitCount") || 0) + 1;
        safeStorage.set("memorySiteVisitCount", String(visitCount));
        const visitEl = document.getElementById("visit-count");
        if (visitEl) visitEl.innerHTML = `<i class="fa-solid fa-star"></i> 네가 이 기록장에 찾아온 건 <strong>${visitCount}</strong>번째야.`;

        const introContent = document.querySelector(".intro-content");
        if (introContent) {
            const hour = new Date().getHours();
            let icon = "fa-moon", msg = "밤하늘이 예쁜 시간이야. 천천히 우리의 기록장을 둘러봐.";
            if (hour >= 5 && hour < 11) { icon = "fa-sun"; msg = "좋은 아침이야. 오늘도 우리의 이야기가 조용히 빛나고 있어."; }
            else if (hour >= 11 && hour < 17) { icon = "fa-cloud-sun"; msg = "햇살이 머무는 시간이야. 오늘의 기록도 따뜻하기를."; }
            else if (hour >= 17 && hour < 21) { icon = "fa-star-half-stroke"; msg = "노을이 내려앉는 시간이야. 우리의 순간들도 예쁘게 남아 있어."; }
            
            const greet = document.createElement("p"); greet.className = "memory-time-greeting"; greet.innerHTML = `<i class="fa-solid ${icon}"></i>${msg}`;
            const notice = document.createElement("p"); notice.className = "memory-update-notice"; notice.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i>${SITE_UPDATE_TEXT}`;
            
            if (document.getElementById("random-message")) document.getElementById("random-message").insertAdjacentElement("afterend", greet);
            if (visitEl) visitEl.insertAdjacentElement("beforebegin", notice);
        }

        document.body.classList.add("protect-selection");
        document.addEventListener("contextmenu", e => { if (!e.target.closest("input, textarea")) e.preventDefault(); });
        document.addEventListener("keydown", e => {
            if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) || (e.ctrlKey && ["u", "s"].includes(e.key.toLowerCase()))) e.preventDefault();
        });
    }

    // =========================================
    // 9. 이스터에그 결합 로직
    // =========================================
    function initEasterEggs() {
        const title = document.querySelector(".main-title");
        title?.addEventListener("click", () => {
            titleClickCount++;
            if (titleClickCount >= 5) {
                titleClickCount = 0; document.getElementById("easter-secret")?.classList.add("revealed");
                showSecretToast("숨겨진 별빛 기록이 열렸어!", 3200); window.launchHeartFireworks({ currentTarget: title });
            }
        });

        window.hideEasterSecret = () => document.getElementById("easter-secret")?.classList.remove("revealed");

        document.addEventListener("keydown", e => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
            const k = e.key.toLowerCase();
            
            typedSecretBuffer = (typedSecretBuffer + k).slice(-12);
            if (typedSecretBuffer.includes("haeun") || typedSecretBuffer.includes("하은")) {
                typedSecretBuffer = ""; showSecretToast("넌 언제나 밤하늘에서 빛나고 있는 별이야.", 3600); window.launchHeartFireworks();
            }

            if (/[0-9]/.test(k)) {
                dateBuffer = (dateBuffer + k).slice(-4);
                if (dateBuffer === "0416") {
                    dateBuffer = ""; showSecretToast("0416, 그날의 별빛을 기억하고 있어.", 3600); window.launchHeartFireworks();
                }
            }
        });

        const heartBtn = document.querySelector(".heart-burst-btn");
        heartBtn?.addEventListener("click", () => {
            heartClickCount++;
            if (heartClickCount >= 10) {
                heartClickCount = 0; showSecretToast("마음이 가득 차서 별이 되었어!", 3600);
                document.body.classList.add("heart-reward-active"); setTimeout(() => document.body.classList.remove("heart-reward-active"), 5000);
            }
        });

        const startLongPress = () => { longPressTimer = setTimeout(() => { document.body.classList.add("theme-our-night", "our-night-unlocked"); showSecretToast("우리의 밤 테마가 열렸어.", 3200); window.launchHeartFireworks(); }, 850); };
        const cancelLongPress = () => clearTimeout(longPressTimer);
        const icon = document.querySelector(".welcome-icon");
        icon?.addEventListener("mousedown", startLongPress); icon?.addEventListener("mouseup", cancelLongPress); icon?.addEventListener("mouseleave", cancelLongPress);
        icon?.addEventListener("touchstart", startLongPress, { passive: true }); icon?.addEventListener("touchend", cancelLongPress, { passive: true });
    }

    // =========================================
    // 10. 엔딩 크레딧 옵저버
    // =========================================
    function initEndingCredits() {
        const credits = document.getElementById("ending-credits");
        const roll = document.getElementById("credits-roll");
        if (!credits || !roll) return;

        function startEnding() {
            if (credits.classList.contains("play") || credits.classList.contains("ended")) return;
            credits.classList.add("play");
            setTimeout(() => { credits.classList.remove("play"); credits.classList.add("ended"); }, 64000);
            if (!endingFireworkPlayed) { endingFireworkPlayed = true; setTimeout(window.launchHeartFireworks, 900); }
        }

        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { startEnding(); observer.unobserve(credits); } });
        }, { threshold: 0.2 });
        observer.observe(credits);

        window.restartEndingCredits = function() {
            credits.classList.remove("play", "ended");
            void credits.offsetWidth;
            startEnding(); showSecretToast("엔딩 크레딧을 다시 재생할게.", 2200);
        };

        new MutationObserver(() => {
            if (credits.classList.contains("ended")) {
                let badge = document.getElementById("ending-complete-badge");
                if (!badge) {
                    badge = document.createElement("p"); badge.id = "ending-complete-badge"; badge.className = "ending-complete-badge";
                    badge.innerHTML = '<i class="fa-solid fa-award"></i>엔딩까지 함께한 사람';
                    document.querySelector(".intro-content")?.appendChild(badge);
                }
                badge.classList.add("show"); document.body.classList.add("has-ending-complete-badge");
                safeStorage.set(STORAGE_KEYS.endingBadge, "true");
            }
        }).observe(credits, { attributes: true, attributeFilter: ["class"] });

        if (safeStorage.get(STORAGE_KEYS.endingBadge) === "true") document.body.classList.add("has-ending-complete-badge");
    }

    // =========================================
    // 메인 시스템 초기화 및 실행
    // =========================================
    function init() {
        initWelcomeModal();
        initBgmVolumeMemory();
        initSlideshow();
        initLightbox();
        initScrollEffects();
        initFadeObserver();
        initMobileNav();
        initExtraFeatures();
        initEasterEggs();
        initEndingCredits();
        
        window.setSiteTheme(safeStorage.get("memorySiteTheme") || "night");
        if (document.getElementById("random-message")) document.getElementById("random-message").innerText = loveMessages[Math.floor(Math.random() * loveMessages.length)];
        
        updateDday();
        setInterval(updateDday, 1000);
        
        // 터치 기기(모바일)는 별빛 트레일 오버헤드를 완화하기 위해 touchmove 대신 포인터 기반 핸들러 적용
        const handleMove = (e) => createStar(e.clientX || e.touches?.[0]?.clientX, e.clientY || e.touches?.[0]?.clientY);
        document.addEventListener("mousemove", handleMove, { passive: true });
        document.addEventListener("touchmove", (e) => { if (e.touches.length === 1) handleMove(e); }, { passive: true });
        
        const pwInput = document.getElementById("letter-password");
        pwInput?.addEventListener("keydown", e => { if (e.key === "Enter") window.checkPassword(); });
    }

    window.addEventListener("load", hideLoadingScreen, { once: true });
    setTimeout(hideLoadingScreen, LOADING_MAX_VISIBLE_MS);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
