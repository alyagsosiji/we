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
        "사랑해. 하은아.", "언제나 곁에 있어줘.", "우리의 이야기가 언제나 행복하기를.",
        "언제나 웃어줘, 그럼 나도 웃을테니.", "밤하늘의 별처럼 언제나 밝게 빛나기를.", "나에게 넌 언제나 밝게 빛나는 밤하늘의 별이야."
    ];
    const LOADING_MIN_VISIBLE_MS = 700;
    const LOADING_MAX_VISIBLE_MS = 1800;
    const loadingStartedAt = Date.now();
    const SITE_UPDATE_TEXT = "마지막 업데이트 : 2026.05.19 17:00";

    const STORAGE_KEYS = {
        bgmVolume: "memorySiteBgmVolume",
        bgmMuted: "memorySiteBgmMuted",
        endingBadge: "memorySiteEndingCompleteBadge",
        heartClicks: "memorySiteHeartClicks",
        hiddenTheme: "memorySiteHiddenTheme"
    };

    let slideIndex = 0, slideTimer = null, slides = [];
    let slidePaused = false, slidePauseLocked = false, slideResumeTimer = null;
    let secretToastTimer = null, titleClickCount = 0, footerClickCount = 0, bgmSecretClickCount = 0;
    let typedSecretBuffer = "", dateBuffer = "";
    let endingFireworkPlayed = false, endingFinishTimer = null;
    let currentScrollPercent = 0, targetScrollPercent = 0, currentParallax = 0, targetParallax = 0;
    let heartClickCount = 0, footerRewardShown = false, longPressTimer = null;

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const safeStorage = {
        get(key) { try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (e) { return null; } },
        set(key, value) { try { if (window.localStorage) window.localStorage.setItem(key, value); } catch (e) {} },
        getSession(key) { try { return window.sessionStorage ? window.sessionStorage.getItem(key) : null; } catch (e) { return null; } },
        setSession(key, value) { try { if (window.sessionStorage) window.sessionStorage.setItem(key, value); } catch (e) {} }
    };

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.innerText = value;
    }

    // =========================================
    // 2. 화면 로딩 및 점검 모드, 초기 팝업
    // =========================================
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
    // 3. BGM 컨트롤
    // =========================================
    window.toggleBGM = function() {
        const audio = document.getElementById("myAudio");
        const icon = document.getElementById("bgm-icon");
        const player = document.getElementById("bgm-container");
        if (!audio) return;

        if (audio.paused) {
            audio.play().then(() => {
                icon?.classList.add("rotating");
                player?.classList.add("playing");
                document.body.classList.add("bgm-playing");
            }).catch(() => alert("음원을 재생할 수 없어! 기기의 소리 설정이나 절전 모드를 확인해줘 🥺"));
        } else {
            audio.pause();
            icon?.classList.remove("rotating");
            player?.classList.remove("playing");
            document.body.classList.remove("bgm-playing");
        }
    };

    window.toggleMute = function(event) {
        event?.stopPropagation();
        const audio = document.getElementById("myAudio");
        const muteIcon = document.getElementById("bgm-mute-icon");
        if (!audio || !muteIcon) return;
        audio.muted = !audio.muted;
        muteIcon.className = audio.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
    };

    function initBgmVolumeMemory() {
        const audio = document.getElementById("myAudio");
        const volumeSlider = document.getElementById("bgm-volume");
        const muteIcon = document.getElementById("bgm-mute-icon");
        if (!audio || !volumeSlider) return;

        const savedVolume = Number(safeStorage.get(STORAGE_KEYS.bgmVolume));
        if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
            audio.volume = savedVolume;
            volumeSlider.value = String(savedVolume);
        }

        const savedMuted = safeStorage.get(STORAGE_KEYS.bgmMuted);
        if (savedMuted === "true") audio.muted = true;
        else if (savedMuted === "false") audio.muted = false;

        function updateMuteIcon() {
            if (muteIcon) muteIcon.className = audio.muted || audio.volume === 0 ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
        }

        function saveCurrentVolume() {
            safeStorage.set(STORAGE_KEYS.bgmVolume, String(audio.volume));
            safeStorage.set(STORAGE_KEYS.bgmMuted, String(audio.muted));
            volumeSlider.classList.add("memory-volume-saved");
            clearTimeout(volumeSlider._volumeSaveTimer);
            volumeSlider._volumeSaveTimer = setTimeout(() => volumeSlider.classList.remove("memory-volume-saved"), 650);
            updateMuteIcon();
        }

        volumeSlider.addEventListener("input", () => {
            const vol = Number(volumeSlider.value);
            if (Number.isFinite(vol)) { audio.volume = vol; audio.muted = vol === 0; saveCurrentVolume(); }
        });
        audio.addEventListener("volumechange", () => { volumeSlider.value = String(audio.volume); saveCurrentVolume(); });
        
        audio.addEventListener("play", () => { document.body.classList.add("bgm-playing"); });
        audio.addEventListener("pause", () => { document.body.classList.remove("bgm-playing"); });
        audio.addEventListener("ended", () => { document.body.classList.remove("bgm-playing"); });
        updateMuteIcon();
    }

    // =========================================
    // 4. 편지 잠금 및 이메일 전송
    // =========================================
    async function sha256(text) {
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
            const data = new TextEncoder().encode(text);
            const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
        }
        return text; // Fallback for simplicity if crypto is not supported
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
        const inputHash = window.crypto ? await sha256(inputElement.value || "") : inputElement.value; // 단순 처리

        // 입력값이 "0416"이거나 해시값이 일치할 때 통과
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
                        setTimeout(type, Math.max(5, 20 + (Math.random() * 20 - 10)));
                    } else {
                        replyBtn.classList.add("is-visible");
                        replyBtn.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 1000, fill: "forwards" });
                    }
                }
                type();
            }, 800);
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

        // 복사 후 메일 앱 열기 (메일앱 연동 안된 사용자 배려)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                alert("우리의 기록장에 편지가 잘 남겨졌어! 고마워 ❤️\n(혹시 메일 앱이 열리지 않는다면 내용이 복사되었으니 직접 내 메일로 보내줘!)");
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
    // 5. 슬라이드 및 갤러리 기능
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
            }, 120);
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
        slides.forEach((_, index) => {
            const dot = document.createElement("button");
            dot.className = "slide-dot";
            dot.addEventListener("click", () => showSlide(index, true));
            dotsContainer.appendChild(dot);
        });

        showSlide(0); startSlideTimer();

        const slideshow = document.getElementById("slideshow");
        slideshow?.addEventListener("mouseenter", () => { if (!slidePauseLocked) setSlidePaused(true, false); });
        slideshow?.addEventListener("mouseleave", () => { if (!slidePauseLocked) setSlidePaused(false, false); });
    }

    // 라이트박스
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
    // 6. 스크롤, 디데이, UI 효과
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
        currentScrollPercent += (targetScrollPercent - currentScrollPercent) * 0.1;
        currentParallax += (targetParallax - currentParallax) * 0.1;
        
        const scrollBar = document.getElementById("scroll-bar");
        const scrollStar = document.getElementById("scroll-star");
        const stars = document.querySelector(".stars");
        
        if (scrollBar) scrollBar.style.width = `${Math.max(0, Math.min(currentScrollPercent, 100))}%`;
        if (scrollStar) scrollStar.style.transform = `rotate(${currentScrollPercent * 3.6}deg)`;
        if (stars) stars.style.transform = `translateY(-${currentParallax}px)`;
        
        window.requestAnimationFrame(smoothScrollAnimation);
    }

    function initScrollEffects() {
        const update = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            targetScrollPercent = (scrollTop / docHeight) * 100;
            targetParallax = (scrollTop / docHeight) * 30;
        };
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        update(); smoothScrollAnimation();
    }

    function initFadeObserver() {
        const items = $$(".timeline-item, .gallery-item");
        if (!("IntersectionObserver" in window)) { items.forEach(i => i.classList.add("visible")); return; }
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
        }, { threshold: 0.15 });
        items.forEach(i => observer.observe(i));
    }

    // =========================================
    // 7. 모바일 네비게이션 및 테마
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
                window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
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
    // 8. 부가 기능 (별, 폭죽, 방어, 방문자수, 스켈레톤 등)
    // =========================================
    function createStar(x, y) {
        if (Math.random() > 0.75) return;
        const star = document.createElement("div");
        star.className = "mouse-star";
        star.style.left = `${x + (Math.random() - 0.5) * 15}px`;
        star.style.top = `${y + (Math.random() - 0.5) * 15}px`;
        const size = Math.random() * 6 + 6;
        star.style.width = `${size}px`; star.style.height = `${size}px`;
        document.body.appendChild(star);
        setTimeout(() => star.remove(), 1000);
    }

    window.launchHeartFireworks = function(event) {
        const rect = event?.currentTarget?.getBoundingClientRect?.();
        const startX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const startY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
        const hearts = ["❤", "♥", "✦", "✧", "💜", "💗"];
        const colors = ["#ffffff", "#c7a4ff", "#ff8fd8", "#ffd1ec", "#b69cff"];

        for (let i = 0; i < 42; i++) {
            const p = document.createElement("span");
            p.className = "heart-particle"; p.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            const angle = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 190;
            const dur = 950 + Math.random() * 800;
            p.style.setProperty("--start-x", `${startX}px`);
            p.style.setProperty("--start-y", `${startY}px`);
            p.style.setProperty("--move-x", `${Math.cos(angle) * dist}px`);
            p.style.setProperty("--move-y", `${Math.sin(angle) * dist - 70}px`);
            p.style.setProperty("--heart-size", `${13 + Math.random() * 17}px`);
            p.style.setProperty("--heart-duration", `${dur}ms`);
            p.style.setProperty("--rotate", `${Math.random() * 720 - 360}deg`);
            p.style.setProperty("--heart-color", colors[Math.floor(Math.random() * colors.length)]);
            document.body.appendChild(p);
            setTimeout(() => p.remove(), dur + 120);
        }
    };

    function showSecretToast(msg, dur = 2800) {
        const t = document.getElementById("secret-toast");
        if (!t) return;
        t.innerHTML = msg; t.classList.add("show");
        clearTimeout(secretToastTimer);
        secretToastTimer = setTimeout(() => t.classList.remove("show"), dur);
    }

    function initExtraFeatures() {
        // 이미지 스켈레톤
        $$(".image-wrapper img, .item-image img, #slide-image").forEach(img => {
            const wrap = img.closest(".image-wrapper, .item-image, .slide-image-wrap");
            if (!wrap) return;
            wrap.classList.add("memory-img-skeleton");
            const markLoaded = () => wrap.classList.add("memory-img-loaded");
            img.addEventListener("load", markLoaded);
            if (img.complete && img.naturalWidth > 0) markLoaded();
        });

        // 위로가기 버튼
        const topBtn = document.createElement("button");
        topBtn.className = "back-to-top-star"; topBtn.innerHTML = '<i class="fa-solid fa-star"></i>';
        document.body.appendChild(topBtn);
        topBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
        window.addEventListener("scroll", () => topBtn.classList.toggle("show", window.scrollY > 520));

        // 방문 횟수
        const visitCount = Number(safeStorage.get("memorySiteVisitCount") || 0) + 1;
        safeStorage.set("memorySiteVisitCount", String(visitCount));
        const visitEl = document.getElementById("visit-count");
        if (visitEl) visitEl.innerHTML = `<i class="fa-solid fa-star"></i> 네가 이 기록장에 찾아온 건 <strong>${visitCount}</strong>번째야.`;

        // 시간대 인사 & 업데이트 알림
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

        // 우클릭/F12 방지
        document.body.classList.add("protect-selection");
        document.addEventListener("contextmenu", e => { if (!e.target.closest("input, textarea")) e.preventDefault(); });
        document.addEventListener("keydown", e => {
            if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) || (e.ctrlKey && ["u", "s"].includes(e.key.toLowerCase()))) e.preventDefault();
        });
    }

    // =========================================
    // 9. 이스터에그 모음
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

        // 롱 터치 히든 테마
        const startLongPress = () => { longPressTimer = setTimeout(() => { document.body.classList.add("theme-our-night", "our-night-unlocked"); showSecretToast("우리의 밤 테마가 열렸어.", 3200); window.launchHeartFireworks(); }, 850); };
        const cancelLongPress = () => clearTimeout(longPressTimer);
        const icon = document.querySelector(".welcome-icon");
        icon?.addEventListener("mousedown", startLongPress); icon?.addEventListener("mouseup", cancelLongPress); icon?.addEventListener("mouseleave", cancelLongPress);
        icon?.addEventListener("touchstart", startLongPress); icon?.addEventListener("touchend", cancelLongPress);
    }

    // =========================================
    // 10. 엔딩 크레딧
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
            entries.forEach(e => { if (e.isIntersecting) startEnding(); });
        }, { threshold: 0.28 });
        observer.observe(credits);

        window.restartEndingCredits = function() {
            credits.classList.remove("play", "ended");
            void credits.offsetWidth; // trigger reflow
            startEnding(); showSecretToast("엔딩 크레딧을 다시 재생할게.", 2200);
        };

        // 엔딩 완료 배지 옵저버
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
    // 메인 초기화 실행
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
        
        document.addEventListener("mousemove", e => createStar(e.clientX, e.clientY), { passive: true });
        
        const pwInput = document.getElementById("letter-password");
        pwInput?.addEventListener("keydown", e => { if (e.key === "Enter") window.checkPassword(); });
    }

    window.addEventListener("load", hideLoadingScreen);
    setTimeout(hideLoadingScreen, LOADING_MAX_VISIBLE_MS);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
