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
// 4번: BGM 플레이어 로직
// =========================================
function toggleBGM() {
    const audio = document.getElementById("myAudio");
    const icon = document.getElementById("bgm-icon");
    
    if (audio.paused) {
        audio.play();
        icon.classList.add("rotating"); // 음악 재생 시 아이콘 회전
    } else {
        audio.pause();
        icon.classList.remove("rotating");
    }
}

// =========================================
// 2번: 비밀 편지 잠금해제 로직
// =========================================
// =========================================
// 1번 & 2번: 비밀 편지 잠금해제 및 타자기 효과 로직
// (기존 checkPassword 함수를 덮어쓰기 하세요)
// =========================================
// =========================================
// 비밀 편지 및 타자기 효과 (+ 답장 버튼 연동)
// =========================================
function checkPassword() {
    const input = document.getElementById("letter-password").value;
    const lockScreen = document.getElementById("lock-screen");
    const realContent = document.getElementById("letter-real-content");
    const letterTextDiv = document.querySelector(".letter-text");
    const replyBtn = document.getElementById("reply-btn");

    if (input === "0416") {
        lockScreen.style.display = "none";
        realContent.style.display = "block";
        replyBtn.style.display = "none"; // 타이핑 중엔 버튼 숨김
        
        const originalHTML = letterTextDiv.innerHTML;
        letterTextDiv.innerHTML = ""; 
        
        setTimeout(() => {
            // 타자기가 끝나면 버튼이 부드럽게 나타나도록 콜백 함수 전달
            typeWriterEffect(letterTextDiv, originalHTML, 40, () => {
                replyBtn.style.display = "inline-block";
                replyBtn.animate([ { opacity: 0 }, { opacity: 1 } ], { duration: 1000, fill: "forwards" });
            });
        }, 1000);
    } else {
        alert("비밀번호가 틀렸어! 우리만의 소중한 날짜를 입력해줘.");
        document.getElementById("letter-password").value = "";
    }
}

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
                type();
            } else {
                let randomSpeed = baseSpeed + (Math.random() * 40 - 20); 
                setTimeout(type, randomSpeed);
            }
        } else {
            // 모든 글자를 다 쳤을 때 콜백 실행
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

// 1번(패럴랙스) & 3번(스크롤 진행바) 동시 적용
window.addEventListener("scroll", function() {
    const scrollTop = window.scrollY;
    
    // 3번: 스크롤 진행바 로직
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    const scrollBar = document.getElementById("scroll-bar");
    const scrollStar = document.getElementById("scroll-star");
    
    if(scrollBar) scrollBar.style.width = scrollPercent + "%";
    if(scrollStar) scrollStar.style.transform = `rotate(${scrollPercent * 3.6}deg)`; // 스크롤에 맞춰 별 회전

    // 1번: 패럴랙스 배경 움직임 로직 (별과 오로라가 스크롤에 반응)
    const stars = document.querySelector(".stars");
    const aurora = document.querySelector(".aurora");
    
    // 모바일에서는 성능을 위해 아주 살짝만, PC에서는 눈에 띄게 움직임
    if(stars) stars.style.transform = `translateY(${scrollTop * 0.2}px)`;
    if(aurora) aurora.style.transform = `translateY(${scrollTop * 0.08}px)`;
});
// 1초(1000 밀리초)마다 함수를 실행해서 시계처럼 작동하게 만들기
setInterval(updateDday, 1000);
// 페이지 접속하자마자 즉시 한 번 실행
updateDday();
