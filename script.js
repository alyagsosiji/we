document.addEventListener("DOMContentLoaded", function () {
    // 기존의 타임라인(.timeline-item)뿐만 아니라 
    // 새로 추가된 갤러리 사진(.gallery-item)까지 모두 찾아서 애니메이션을 적용합니다.
    const animateItems = document.querySelectorAll(".timeline-item, .gallery-item");

    // 화면에 나타나는 것을 감지하는 기능 (Observer)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            // 카드가 화면 아래에서 15% 정도 보이기 시작할 때 visible 클래스 추가
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, {
        threshold: 0.15 
    });

    // 찾은 모든 요소(타임라인 + 갤러리 사진)에 감지 기능 달아주기
    animateItems.forEach((item) => {
        observer.observe(item);
    });
});
// =========================================
// 1. BGM 플레이어 로직 (웹 서버 배포용 최종 버전)
// =========================================
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
    if (event) event.stopPropagation();

    const audio = document.getElementById("myAudio");
    const muteIcon = document.getElementById("bgm-mute-icon");
    if (!audio || !muteIcon) return;

    audio.muted = !audio.muted;
    muteIcon.className = audio.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
}


// =========================================
// 2. 비밀 편지 잠금해제 (타자 속도 10로 쾌속 설정!)
// =========================================
// =========================================
// 수정된 비밀 편지 잠금해제 (중복 실행 방지)
// =========================================
async function sha256(text) {
    // HTTPS/localhost에서는 Web Crypto API를 사용하고,
    // file://로 바로 열었을 때를 대비해 순수 JS 해시 계산으로 한 번 더 대응합니다.
    if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
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
            for (let i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    let ascii = unescape(encodeURIComponent(text));
    const asciiBitLength = ascii.length * 8;
    ascii += "\x80";

    while (ascii.length % 64 - 56) {
        ascii += "\x00";
    }

    for (let i = 0; i < ascii.length; i++) {
        const code = ascii.charCodeAt(i);
        words[i >> 2] |= code << (((3 - i) % 4) * 8);
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

        for (let i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
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
    const input = document.getElementById("letter-password").value;
    const lockScreen = document.getElementById("lock-screen");
    const realContent = document.getElementById("letter-real-content");
    const letterTextDiv = document.querySelector(".letter-text");
    const replyBtn = document.getElementById("reply-btn");
    const submitBtn = document.querySelector(".password-field button");
    
    // 기존 비밀번호 0416을 직접 노출하지 않고 SHA-256 해시값으로 비교합니다.
    // 참고: 프론트엔드만으로는 완벽한 보안은 아니지만, 평문 비교보다는 안전합니다.
    const savedPasswordHash = "adfaab87038c95002ab05463e743201605457409b7129f9a3a8cddcb8caea1a2";
    const inputHash = await sha256(input);

    if (inputHash === savedPasswordHash) {
        if (submitBtn) submitBtn.disabled = true;

        lockScreen.style.display = "none";
        realContent.style.display = "block";
        realContent.classList.add("unlocked");
        replyBtn.style.display = "none"; 
        
        const originalHTML = letterTextDiv.innerHTML;
        letterTextDiv.innerHTML = ""; 
        
        setTimeout(() => {
            typeWriterEffect(letterTextDiv, originalHTML, 20, () => {
                replyBtn.style.display = "inline-block";
                replyBtn.animate([ { opacity: 0 }, { opacity: 1 } ], { duration: 1000, fill: "forwards" });
            });
        }, 800); 
    } else {
        alert("비밀번호가 틀렸어! 우리의 소중한 날짜를 입력해줘.");
        document.getElementById("letter-password").value = "";
    }
}

// =========================================
// 3. 타자기 효과 함수 (편차를 줄여서 매끄럽고 빠르게)
// =========================================
function typeWriterEffect(element, html, baseSpeed, onComplete) {
    const tokens = html.match(/<[^>]+>|[^<]/g) || [];
    let i = 0;
    element.innerHTML = "";
    let currentHTML = "";

    function type() {
        if (i < tokens.length) {
            let token = tokens[i];
            currentHTML += token;
            element.innerHTML = currentHTML;
            i++;

            if (token.startsWith("<")) {
                type(); // HTML 태그는 딜레이 없이 즉시 통과
            } else {
                // 편차를 기존 40에서 20으로 줄여서 버벅거림 없이 타다닥 쳐지게 만듦
                let randomSpeed = Math.max(5, baseSpeed + (Math.random() * 20 - 10)); 
                setTimeout(type, randomSpeed);
            }
        } else {
            if(onComplete) onComplete();
        }
    }
    type();
}
// =========================================
// 3번: 갤러리 라이트박스 (사진 클릭 시 확대) 로직
// =========================================
document.addEventListener("DOMContentLoaded", function () {
    const galleryImages = document.querySelectorAll(".item-image img");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");

    galleryImages.forEach(img => {
        img.style.cursor = "pointer"; // 클릭 가능하다는 커서 표시
        img.addEventListener("click", function() {
            lightboxImg.src = this.src;
            lightbox.classList.add("show");
        });
    });
});

// 라이트박스 닫기 함수
function closeLightbox() {
    document.getElementById("lightbox").classList.remove("show");
}

// =========================================
// 4번: 마우스 & 모바일 터치 별무리 트레일 로직 
// =========================================

function createStar(x, y) {
    if (Math.random() > 0.75) return;

    const star = document.createElement("div");
    star.className = "mouse-star";
    
    // 마우스 궤적을 정확히 따라가도록 퍼지는 범위를 대폭 축소 (15px 이내)
    const offsetX = (Math.random() - 0.5) * 15; 
    const offsetY = (Math.random() - 0.5) * 15;
    
    star.style.left = (x + offsetX) + "px";
    star.style.top = (y + offsetY) + "px";
    
    const size = Math.random() * 6 + 6; // 6px ~ 12px
    star.style.width = size + "px";
    star.style.height = size + "px";

    document.body.appendChild(star);

    // 제자리에서 사라지므로 1초 정도면 궤적이 깔끔하고 예쁘게 남습니다
    setTimeout(() => {
        star.remove();
    }, 1000);
}

// PC: 마우스 움직임 감지
document.addEventListener("mousemove", function(e) {
    createStar(e.clientX, e.clientY);
});

// 모바일: 화면 터치 후 움직임 감지
document.addEventListener("touchmove", function(e) {
    const touch = e.touches[0];
    createStar(touch.clientX, touch.clientY);
}, { passive: true });
// =========================================
// 자동으로 모드가 바뀌는 실시간 디데이 카운터 로직
// =========================================
function updateDday() {
    // 기준일 설정: 2026년 4월 16일 자정 기준
    const startDate = new Date("2026-04-16T00:00:00").getTime();
    const now = new Date().getTime();
    
    // 현재 시간과 기준일의 차이 계산 (밀리초)
    let distance = now - startDate;
    
    const labelElement = document.querySelector(".d-day-label");

    // 1. 지정한 날짜가 아직 안 되었을 때 (미래일 때: 카운트다운 모드)
    if (distance < 0) {
        // 타이틀 문구 자동 변경
        if(labelElement) labelElement.innerText = "우리의 이야기가 시작되기까지";
        
        // 남은 시간 계산을 위해 부호를 반대로 변경
        distance = startDate - now; 
    } 
    // 2. 지정한 날짜가 지났을 때 (과거일 때: 지난 날짜 카운트 모드)
    else {
        // 타이틀 문구 자동 변경
        if(labelElement) labelElement.innerText = "우리의 이야기가 시작된 지";
    }
    
    // 일, 시간, 분, 초 계산
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    // HTML 화면에 숫자 실시간 업데이트
    document.getElementById("days").innerText = days;
    document.getElementById("hours").innerText = hours.toString().padStart(2, '0');
    document.getElementById("minutes").innerText = minutes.toString().padStart(2, '0');
    document.getElementById("seconds").innerText = seconds.toString().padStart(2, '0');
}
// =========================================
// 새로 추가된 기능들 (패럴랙스, 랜덤 문구, 진행바)
// =========================================

document.addEventListener("DOMContentLoaded", function () {
    // 2. 랜덤 애정 문구 출력
    const loveMessages = [
        "사랑해. 하은아.",
        "언제나 곁에 있어줘.",
        "우리의 이야기가 언제나 행복하기를.",
        "언제나 웃어줘, 그럼 나도 웃을테니.",
        "밤하늘의 별처럼 언제나 밝게 빛나기를.",
        "나에게 넌 언제나 밝게 빛나는 밤하늘의 별이야."
    ];
    const randomMsg = loveMessages[Math.floor(Math.random() * loveMessages.length)];
    const msgElement = document.getElementById("random-message");
    if(msgElement) msgElement.innerText = randomMsg;
});

// =========================================
// 1번 & 3번: 스크롤 진행바 부드럽게 + 패럴랙스 배경 고침
// =========================================

// 애니메이션 부드럽게 처리를 위한 변수 (보간법)
let currentScrollPercent = 0;
let targetScrollPercent = 0;
let currentParallax = 0;
let targetParallax = 0;

window.addEventListener("scroll", function() {
    const scrollTop = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    
    // 목표값을 업데이트만 하고, 실제 움직임은 아래 애니메이션 루프에서 처리
    targetScrollPercent = (scrollTop / docHeight) * 100;
    
    // 배경은 전체를 밀어내지 않고, 스크롤 방향의 반대로 살짝 땡겨서 끊김 현상 방지
    // (이동 범위를 50px 이내로 제한하여 빈 공간이 보이지 않게 함)
    targetParallax = (scrollTop / docHeight) * 30; 
});

// 60프레임으로 부드럽게 따라가는 애니메이션 루프
function smoothScrollAnimation() {
    const scrollBar = document.getElementById("scroll-bar");
    const scrollStar = document.getElementById("scroll-star");
    const stars = document.querySelector(".stars");
    
    // 0.1의 속도로 목표치까지 부드럽게 따라가기 (Lerp)
    currentScrollPercent += (targetScrollPercent - currentScrollPercent) * 0.1;
    currentParallax += (targetParallax - currentParallax) * 0.1;

    // 진행바 너비와 별 회전 업데이트
    if(scrollBar) {
        scrollBar.style.width = currentScrollPercent + "%";
    }
    if(scrollStar) {
        scrollStar.style.transform = `rotate(${currentScrollPercent * 3.6}deg)`;
    }

    // 우주 배경을 살짝만 위로 당겨서 입체감은 주되, 끊기지 않게 방어
    if(stars) {
        stars.style.transform = `translateY(-${currentParallax}px)`; 
    }

    // 다음 프레임 요청
    requestAnimationFrame(smoothScrollAnimation);
}
// =========================================
// 답장 우체통 (모달 창) 열고 닫기 로직
// =========================================
function openReplyBox() {
    document.getElementById("reply-modal").classList.add("show");
}

function closeReplyBox() {
    document.getElementById("reply-modal").classList.remove("show");
}

// =========================================
// 작성한 편지 내용 전송하기 로직
// =========================================
function sendReply() {
    const text = document.getElementById("reply-text").value;
    
    if(text.trim() === "") {
        alert("내용을 조금이라도 적어줘! 🥺");
        return;
    }

    // 전송 완료 알림 띄우기
    alert("우리의 기록장에 편지가 잘 남겨졌어! 고마워. ❤️");
    
    // 💡 아래 이메일 주소를 아시님의 진짜 이메일로 변경하세요!
    // 모바일이나 PC에서 메일 앱을 자동으로 열어 작성한 내용을 넣어줍니다.
    const myEmail = "atritime@gmail.com"; 
    const subject = encodeURIComponent("[우리의 기록장] 사이트에서 누군가 보낸 답장이야.");
    const body = encodeURIComponent(text);
    
    window.location.href = `mailto:${myEmail}?subject=${subject}&body=${body}`;
    
    // 편지창 닫기 및 초기화
    closeReplyBox();
    document.getElementById("reply-text").value = "";
}
// 애니메이션 무한 반복 시작
smoothScrollAnimation();
// =========================================
// 디데이 카운터 실시간 작동 (추가된 코드)
// =========================================
document.addEventListener("DOMContentLoaded", function () {
    // 1. 디데이 타이머 실행
    updateDday(); 
    setInterval(updateDday, 1000); 

    // 2. 비밀번호 창 엔터키 작동 기능
    const passwordInput = document.getElementById("letter-password");
    if(passwordInput) {
        passwordInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                checkPassword();
            }
        });
    }
});

// =========================================
// 추가 기능: 로딩 화면, 첫 방문 안내, BGM 볼륨, 사진 슬라이드쇼, 모바일 메뉴
// =========================================
function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    if (!loadingScreen) return;

    loadingScreen.classList.add("hide");
    setTimeout(() => {
        loadingScreen.style.display = "none";
    }, 700);
}

function closeWelcomeModal() {
    const modal = document.getElementById("welcome-modal");
    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    localStorage.setItem("memorySiteWelcomeSeen", "true");
}

window.addEventListener("load", hideLoadingScreen);
setTimeout(hideLoadingScreen, 2500);

document.addEventListener("DOMContentLoaded", function () {
    // 첫 방문 안내 팝업
    const welcomeModal = document.getElementById("welcome-modal");
    const hasSeenWelcome = localStorage.getItem("memorySiteWelcomeSeen") === "true";

    if (welcomeModal && !hasSeenWelcome) {
        setTimeout(() => {
            welcomeModal.classList.add("show");
            welcomeModal.setAttribute("aria-hidden", "false");
        }, 900);
    }

    // BGM 기본 볼륨 및 볼륨 슬라이더
    const audio = document.getElementById("myAudio");
    const volumeSlider = document.getElementById("bgm-volume");
    const muteIcon = document.getElementById("bgm-mute-icon");

    if (audio && volumeSlider) {
        audio.volume = Number(volumeSlider.value);
        volumeSlider.addEventListener("input", function (event) {
            event.stopPropagation();
            audio.volume = Number(this.value);
            audio.muted = audio.volume === 0;
            if (muteIcon) {
                muteIcon.className = audio.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
            }
        });

        audio.addEventListener("play", () => document.body.classList.add("bgm-playing"));
        audio.addEventListener("pause", () => document.body.classList.remove("bgm-playing"));
        audio.addEventListener("ended", () => document.body.classList.remove("bgm-playing"));
    }

    // 사진 슬라이드쇼 초기화
    initSlideshow();

    // 모바일 메뉴 현재 위치 표시
    initMobileNavActiveState();

    // 추가 감성 기능 초기화
    initSeasonalEffects();
    initEasterEggs();
    initEndingCredits();
});

let slideIndex = 0;
let slideTimer = null;
let slides = [];

function initSlideshow() {
    const galleryItems = document.querySelectorAll(".gallery-item");
    const dotsContainer = document.getElementById("slide-dots");

    if (!galleryItems.length || !dotsContainer) return;

    slides = Array.from(galleryItems).map(item => {
        const img = item.querySelector("img");
        return {
            src: img?.getAttribute("src") || "",
            fallback: img?.getAttribute("onerror") || "",
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
}

function showSlide(index, resetTimer = false) {
    if (!slides.length) return;

    slideIndex = (index + slides.length) % slides.length;
    const currentSlide = slides[slideIndex];
    const slideImage = document.getElementById("slide-image");
    const slideTitle = document.getElementById("slide-title");
    const slideDesc = document.getElementById("slide-desc");
    const dots = document.querySelectorAll(".slide-dot");

    if (slideImage) {
        slideImage.classList.remove("show");
        setTimeout(() => {
            slideImage.src = currentSlide.src;
            slideImage.alt = currentSlide.title;
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

function startSlideTimer() {
    clearInterval(slideTimer);
    slideTimer = setInterval(() => {
        showSlide(slideIndex + 1);
    }, 3500);
}

function initMobileNavActiveState() {
    const navLinks = Array.from(document.querySelectorAll(".mobile-nav a"));
    const sections = ["home", "timeline", "gallery", "letter"]
        .map(id => document.getElementById(id))
        .filter(Boolean);

    if (!navLinks.length || !sections.length) return;

    let ticking = false;

    function setActiveMenu(activeId) {
        navLinks.forEach(link => {
            link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
        });
    }

    function updateActiveByScroll() {
        ticking = false;

        // 모바일 하단 메뉴가 한 칸 건너뛰는 문제를 막기 위해
        // IntersectionObserver 대신 현재 스크롤 위치와 섹션 위치를 직접 비교합니다.
        const checkLine = window.scrollY + Math.min(window.innerHeight * 0.42, 360);
        let activeId = sections[0].id;

        sections.forEach(section => {
            const top = section.offsetTop - 40;
            if (checkLine >= top) {
                activeId = section.id;
            }
        });

        setActiveMenu(activeId);
    }

    function requestUpdate() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(updateActiveByScroll);
    }

    navLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            const targetId = this.getAttribute("href")?.replace("#", "");
            const target = targetId ? document.getElementById(targetId) : null;
            if (!target) return;

            event.preventDefault();
            const mobileOffset = window.innerWidth <= 768 ? 86 : 0;
            const targetTop = target.getBoundingClientRect().top + window.scrollY - mobileOffset;

            window.scrollTo({
                top: Math.max(targetTop, 0),
                behavior: "smooth"
            });

            setActiveMenu(targetId);
        });
    });

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    updateActiveByScroll();
}

// =========================================
// 추가 기능 7, 8, 10 + 기본 코드 보호 UX
// =========================================
const SITE_THEMES = ["night", "cherry", "ocean", "letter"];

function toggleThemePanel() {
    const panel = document.getElementById("theme-panel");
    if (panel) panel.classList.toggle("open");
}

function setSiteTheme(themeName) {
    const safeTheme = SITE_THEMES.includes(themeName) ? themeName : "night";

    document.body.classList.remove("theme-cherry", "theme-ocean", "theme-letter");
    if (safeTheme !== "night") {
        document.body.classList.add(`theme-${safeTheme}`);
    }

    localStorage.setItem("memorySiteTheme", safeTheme);
    updateThemeButtons(safeTheme);
}

function updateThemeButtons(activeTheme) {
    document.querySelectorAll(".theme-options button").forEach(button => {
        button.classList.toggle("active", button.dataset.theme === activeTheme);
    });
}

function initThemeSwitcher() {
    const savedTheme = localStorage.getItem("memorySiteTheme") || "night";
    setSiteTheme(savedTheme);

    document.addEventListener("click", function (event) {
        const panel = document.getElementById("theme-panel");
        if (!panel || panel.contains(event.target)) return;
        panel.classList.remove("open");
    });
}

function updateVisitCount() {
    const visitElement = document.getElementById("visit-count");
    if (!visitElement) return;

    const storageKey = "memorySiteVisitCount";
    const currentCount = Number(localStorage.getItem(storageKey) || 0) + 1;
    localStorage.setItem(storageKey, String(currentCount));

    visitElement.innerHTML = `<i class="fa-solid fa-star"></i> 네가 이 기록장에 찾아온 건 <strong>${currentCount}</strong>번째야.`;
}

function launchHeartFireworks(event) {
    const source = event?.currentTarget || document.querySelector(".heart-burst-btn");
    const rect = source?.getBoundingClientRect();
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
    // 우클릭 방지
    document.addEventListener("contextmenu", function (event) {
        const editable = event.target.closest("input, textarea");
        if (editable) return;
        event.preventDefault();
    });

    // 텍스트 선택 방지
    document.body.classList.add("protect-selection");

    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S 차단
    document.addEventListener("keydown", function (event) {
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
    }, true);
}

document.addEventListener("DOMContentLoaded", function () {
    initThemeSwitcher();
    updateVisitCount();
    initBasicProtection();
});


// =========================================
// 추가 기능 5, 6, 9, 11, 15
// =========================================
let secretToastTimer = null;
let titleClickCount = 0;
let footerClickCount = 0;
let bgmSecretClickCount = 0;
let typedSecretBuffer = "";
let endingFireworkPlayed = false;

function showSecretToast(message, duration = 2800) {
    const toast = document.getElementById("secret-toast");
    if (!toast) return;

    toast.innerHTML = message;
    toast.classList.add("show");
    clearTimeout(secretToastTimer);
    secretToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

function revealEasterSecret() {
    const secretSection = document.getElementById("easter-secret");
    if (!secretSection) return;

    secretSection.classList.add("revealed");
    secretSection.setAttribute("aria-hidden", "false");
    showSecretToast("숨겨진 별빛 기록이 열렸어!", 3200);
    setTimeout(() => {
        secretSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 450);
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

    // 이스터에그 1: 메인 제목을 5번 누르면 숨겨진 기록 카드 등장
    if (title) {
        title.style.cursor = "pointer";
        title.addEventListener("click", () => {
            titleClickCount += 1;
            if (titleClickCount === 3) {
                showSecretToast("조금만 더 누르면 숨겨진 별빛이 열릴지도...?", 2200);
            }
            if (titleClickCount >= 5) {
                titleClickCount = 0;
                revealEasterSecret();
                launchHeartFireworks({ currentTarget: title });
            }
        });
    }

    // 이스터에그 2: 키보드로 'haeun' 또는 '하은'을 입력하면 비밀 메시지
    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key.length !== 1) return;

        typedSecretBuffer = (typedSecretBuffer + event.key.toLowerCase()).slice(-12);
        if (typedSecretBuffer.includes("haeun") || typedSecretBuffer.includes("하은")) {
            typedSecretBuffer = "";
            showSecretToast("넌 언제나 밤하늘에서 빛나고 있는 별이야.", 3600);
            launchHeartFireworks({ currentTarget: document.querySelector(".intro-content") || document.body });
        }
    });

    // 이스터에그 3: 푸터를 3번 누르면 엔딩 크레딧으로 이동
    if (footer) {
        footer.addEventListener("click", () => {
            footerClickCount += 1;
            clearTimeout(footer._easterTimer);
            footer._easterTimer = setTimeout(() => footerClickCount = 0, 1200);

            if (footerClickCount >= 3) {
                footerClickCount = 0;
                showSecretToast("엔딩 크레딧으로 이동할게. 우리의 이야기는 계속될거야.", 2600);
                document.getElementById("ending-credits")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    }

    // 이스터에그 4: BGM 디스크를 빠르게 7번 누르면 배경이 더 반짝임
    if (bgmButton) {
        bgmButton.addEventListener("click", () => {
            bgmSecretClickCount += 1;
            clearTimeout(bgmButton._easterTimer);
            bgmButton._easterTimer = setTimeout(() => bgmSecretClickCount = 0, 1600);

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

function initEndingCredits() {
    const credits = document.getElementById("ending-credits");
    if (!credits) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            credits.classList.add("play");

            if (!endingFireworkPlayed) {
                endingFireworkPlayed = true;
                setTimeout(() => {
                    launchHeartFireworks({ currentTarget: credits.querySelector(".credits-header") || credits });
                }, 900);
            }
        });
    }, { threshold: 0.35 });

    observer.observe(credits);
}

function restartEndingCredits() {
    const credits = document.getElementById("ending-credits");
    const roll = document.getElementById("credits-roll");
    if (!credits || !roll) return;

    credits.classList.remove("play");
    // animation 재시작을 위한 reflow
    void roll.offsetWidth;
    credits.classList.add("play");
    showSecretToast("엔딩 크레딧을 다시 재생할게.", 2200);
}
