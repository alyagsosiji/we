(function () {
    "use strict";

    if (window.__memorySiteLoaded) return;
    window.__memorySiteLoaded = true;

    // --- 글로벌 변수 및 설정 ---
    const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=900&auto=format&fit=crop&q=70";
    const SITE_THEMES = ["night", "cherry", "ocean", "letter"];
    const loveMessages = [
        "사랑해. 하은아.", "언제나 곁에 있어줘.", "우리의 이야기가 언제나 행복하기를.",
        "언제나 웃어줘, 그럼 나도 웃을테니.", "밤하늘의 별처럼 언제나 밝게 빛나기를.", "나에게 넌 언제나 밝게 빛나는 밤하늘의 별이야."
    ];
    const LOADING_MAX_VISIBLE_MS = 1800;
    const STORAGE_KEYS = { bgmVolume: "memorySiteBgmVolume", bgmMuted: "memorySiteBgmMuted", endingBadge: "memorySiteEndingCompleteBadge" };

    // 타이머 및 상태 변수들
    let slideIndex = 0, slideTimer = null, slides = [];
    let slidePaused = false, slidePauseLocked = false, slideResumeTimer = null;
    let secretToastTimer = null, titleClickCount = 0, footerClickCount = 0, bgmSecretClickCount = 0;
    let typedSecretBuffer = "", endingFireworkPlayed = false, endingFinishTimer = null;
    let currentScrollPercent = 0, targetScrollPercent = 0, currentParallax = 0, targetParallax = 0;
    let dateBuffer = "", heartClickCount = 0, footerRewardShown = false;

    // --- 유틸리티 함수 ---
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const safeStorage = {
        get(key) { try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (e) { return null; } },
        set(key, value) { try { if (window.localStorage) window.localStorage.setItem(key, value); } catch (e) {} }
    };

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.innerText = value;
    }

    // --- 사이트 초기 로딩 및 유지보수 화면 ---
    function hideLoadingScreen() {
        const loadingScreen = document.getElementById("loading-screen");
        if (!loadingScreen) return;
        loadingScreen.classList.add("hide");
        setTimeout(() => { loadingScreen.style.display = "none"; }, 580);
    }

    // --- 편지 비밀번호 및 타이핑 ---
    async function checkPassword() {
        const inputElement = document.getElementById("letter-password");
        const lockScreen = document.getElementById("lock-screen");
        const realContent = document.getElementById("letter-real-content");
        const letterTextDiv = document.querySelector(".letter-text");
        const replyBtn = document.getElementById("reply-btn");
        const submitBtn = document.querySelector(".password-field button");

        if (!inputElement || !lockScreen) return;

        // 단순화를 위해 JS 내에서 직접 비교 (실제 서버가 없으므로)
        if (inputElement.value === "0416") {
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
        const tokens = html.match(/<[^>]+>|[^<]/g) || [];
        let i = 0, currentHTML = "";
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
                    setTimeout(type, Math.max(5, baseSpeed + (Math.random() * 20 - 10)));
                }
            } else if (onComplete) {
                onComplete();
            }
        }
        type();
    }

    // --- 편지 답장 (수정된 부분: 클립보드 복사 백업) ---
    function openReplyBox() { document.getElementById("reply-modal")?.classList.add("show"); }
    function closeReplyBox() { document.getElementById("reply-modal")?.classList.remove("show"); }
    function sendReply() {
        const replyText = document.getElementById("reply-text");
        const text = replyText?.value || "";

        if (text.trim() === "") {
            alert("내용을 조금이라도 적어줘! 🥺");
            return;
        }

        // UX 개선: 메일 앱이 안 열릴 경우를 대비해 클립보드에 내용 자동 복사
        navigator.clipboard.writeText(text).then(() => {
            alert("우리의 기록장에 편지가 잘 남겨졌어! 고마워 ❤️\n(혹시 메일 앱이 자동으로 안 열린다면, 내용이 복사되었으니 직접 내 메일로 보내줘!)");
            
            const myEmail = "atritime@gmail.com";
            const subject = encodeURIComponent("[우리의 기록장] 사이트에서 누군가 보낸 답장이야.");
            const body = encodeURIComponent(text);

            window.location.href = `mailto:${myEmail}?subject=${subject}&body=${body}`;
            closeReplyBox();
            replyText.value = "";
        }).catch(err => {
            // 클립보드 권한이 없을 경우 그냥 진행
            const myEmail = "atritime@gmail.com";
            window.location.href = `mailto:${myEmail}?subject=${encodeURIComponent("[우리의 기록장]")}&body=${encodeURIComponent(text)}`;
            closeReplyBox();
        });
    }

    // --- 기타 기존 함수들 (BGM, 슬라이드, 디데이, 이스터에그 등 원본 로직 유지) ---
    // (여기에는 기존에 분리되어 있던 updateDday, toggleBGM, initSlideshow, 
    // initEasterEggs, initEndingCredits 등의 모든 함수가 통합되어 들어갑니다.)
    
    function updateDday() {
        const startDate = new Date("2026-04-16T00:00:00").getTime();
        const now = Date.now();
        let distance = now - startDate;
        const labelElement = document.querySelector(".d-day-label");

        if (distance < 0) {
            if (labelElement) labelElement.innerText = "우리의 이야기가 시작되기까지";
            distance = startDate - now;
        } else if (labelElement) {
            labelElement.innerText = "우리의 이야기가 시작된 지.";
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

    // Window 전역 이벤트 등록 (HTML onclick 등에서 사용하기 위해)
    window.toggleBGM = function() {
        const audio = document.getElementById("myAudio");
        const icon = document.getElementById("bgm-icon");
        const player = document.getElementById("bgm-container");
        if (!audio) return;
        if (audio.paused) {
            audio.play(); icon?.classList.add("rotating"); player?.classList.add("playing");
        } else {
            audio.pause(); icon?.classList.remove("rotating"); player?.classList.remove("playing");
        }
    };
    window.checkPassword = checkPassword;
    window.openReplyBox = openReplyBox;
    window.closeReplyBox = closeReplyBox;
    window.sendReply = sendReply;

    // 초기화 실행
    function init() {
        updateDday();
        setInterval(updateDday, 1000);
        setTimeout(hideLoadingScreen, LOADING_MAX_VISIBLE_MS);
        
        const passwordInput = document.getElementById("letter-password");
        if (passwordInput) {
            passwordInput.addEventListener("keydown", event => {
                if (event.key === "Enter") checkPassword();
            });
        }
        // ... (나머지 스크롤 애니메이션, 테마 초기화 등 원본 호출 로직)
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
