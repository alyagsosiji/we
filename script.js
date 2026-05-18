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
function checkPassword() {
    const input = document.getElementById("letter-password").value;
    const lockScreen = document.getElementById("lock-screen");
    const realContent = document.getElementById("letter-real-content");
    const letterTextDiv = document.querySelector(".letter-text");

    // 비밀번호 설정: 0416
    if (input === "0416") {
        lockScreen.style.display = "none";
        realContent.style.display = "block";
        
        console.log("사랑해 하은아! ❤️");

        // 편지 내용 가져와서 타자기 효과 준비
        const originalHTML = letterTextDiv.innerHTML;
        letterTextDiv.innerHTML = ""; // 화면에서 일단 지움
        
        // 편지지가 펼쳐지는 애니메이션 시간(1초)을 기다렸다가 타자기 효과 시작
        setTimeout(() => {
            typeWriterEffect(letterTextDiv, originalHTML, 40); // 40은 타이핑 속도(ms)
        }, 1000);
        
    } else {
        alert("비밀번호가 틀렸어! 우리만의 소중한 날짜를 입력해줘.");
        document.getElementById("letter-password").value = "";
    }
}

// 타자기 효과를 만들어주는 마법의 함수
function typeWriterEffect(element, html, speed) {
    let i = 0;
    let isTag = false;
    let text = "";
    function type() {
        if (i < html.length) {
            text += html.charAt(i);
            element.innerHTML = text;
            
            // HTML 태그(<br>, <strong> 등)는 깨지지 않게 한 번에 출력하도록 처리
            if (html.charAt(i) === '<') isTag = true;
            if (html.charAt(i) === '>') isTag = false;
            
            i++;
            // 태그 안을 지나고 있을 때는 딜레이 없이 0초로 넘기고, 일반 글자일때만 speed 적용
            setTimeout(type, isTag ? 0 : speed);
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
// 4번: 마우스 별무리 트레일 로직
// =========================================
document.addEventListener("mousemove", function(e) {
    // 모바일(화면 좁을 때)에서는 너무 지저분해질 수 있으니 PC에서만 작동하게 설정
    if(window.innerWidth > 768) {
        // 별 생성
        const star = document.createElement("div");
        star.className = "mouse-star";
        
        // 마우스 포인터 위치로 셋팅
        star.style.left = e.clientX + "px";
        star.style.top = e.clientY + "px";
        document.body.appendChild(star);

        // 0.8초 뒤에 생성된 별무리 삭제 (메모리 낭비 방지)
        setTimeout(() => {
            star.remove();
        }, 800);
    }
});
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

// 1초(1000 밀리초)마다 함수를 실행해서 시계처럼 작동하게 만들기
setInterval(updateDday, 1000);
// 페이지 접속하자마자 즉시 한 번 실행
updateDday();
