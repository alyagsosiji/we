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
    
    if (audio.paused) {
        audio.play().then(() => {
            // 재생 성공 시 디스크 아이콘 회전
            icon.classList.add("rotating");
        }).catch(error => {
            console.error("BGM 재생 오류:", error);
            // 웹 서버에서는 보통 잘 되지만, 간혹 아이폰/갤럭시의 '절전 모드'나 '무음 모드' 때문에 브라우저가 소리를 막을 때만 짧게 알려줍니다.
            alert("음원을 재생할 수 없어! 기기의 소리 설정이나 절전 모드를 확인해줘 🥺");
        });
    } else {
        audio.pause();
        // 일시정지 시 디스크 아이콘 회전 멈춤
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
// =========================================
// 1. BGM 플레이어 로직 (답답한 에러 메시지 대신 원인 안내)
// =========================================
function toggleBGM() {
    const audio = document.getElementById("myAudio");
    const icon = document.getElementById("bgm-icon");
    
    if (audio.paused) {
        audio.play().then(() => {
            icon.classList.add("rotating");
        }).catch(error => {
            console.error("BGM 재생 오류:", error);
            // 웹에 올리면 해결된다는 친절한 알림창
            alert("지금은 내 컴퓨터에서 파일을 열어서 브라우저 보안상 음악이 막혀있어!\n\n나중에 이 사이트를 진짜 인터넷에 올리면(호스팅) 하은이 폰에서는 문제없이 예쁘게 재생될 테니 걱정 마! 😉");
        });
    } else {
        audio.pause();
        icon.classList.remove("rotating");
    }
}

// =========================================
// 2. 비밀 편지 잠금해제 (타자 속도 15로 쾌속 설정!)
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
        replyBtn.style.display = "none"; 
        
        const originalHTML = letterTextDiv.innerHTML;
        letterTextDiv.innerHTML = ""; 
        
        setTimeout(() => {
            // 속도를 기존 40 -> 15로 대폭 낮췄습니다! (숫자가 작을수록 빠름)
            typeWriterEffect(letterTextDiv, originalHTML, 20, () => {
                replyBtn.style.display = "inline-block";
                replyBtn.animate([ { opacity: 0 }, { opacity: 1 } ], { duration: 1000, fill: "forwards" });
            });
        }, 800); // 편지지가 열리고 타자가 시작되는 대기 시간도 조금 줄였습니다.
    } else {
        alert("비밀번호가 틀렸어! 우리만의 소중한 날짜를 입력해줘.");
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
    alert("우리의 기록장에 편지가 잘 남겨졌어! 고마워 ❤️");
    
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
