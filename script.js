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
function typeWriterEffect(element, html, baseSpeed) {
    // 텍스트와 HTML 태그를 분리하는 정규식
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

            // 현재 출력하는 것이 HTML 태그(<br>, <strong> 등)라면 딜레이 없이 즉시 다음으로
            if (token.startsWith("<")) {
                type();
            } else {
                // 타이핑 속도를 살짝 랜덤하게 주어 사람(기계가 아닌)이 치는 것처럼 자연스럽게 연출
                let randomSpeed = baseSpeed + (Math.random() * 40 - 20); 
                setTimeout(type, randomSpeed);
            }
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
// 4번: 마우스 별무리 트레일 로직 (몽환적이고 부드럽게 업그레이드)
// =========================================
document.addEventListener("mousemove", function(e) {
    if(window.innerWidth > 768) {
        // 별이 너무 빽빽하게 생성되지 않도록 30% 확률로만 생성 (부드러운 여운)
        if (Math.random() > 0.3) return;

        const star = document.createElement("div");
        star.className = "mouse-star";
        
        // 마우스 포인트에서 살짝 퍼지도록 랜덤 위치 부여
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;
        
        star.style.left = (e.clientX + offsetX) + "px";
        star.style.top = (e.clientY + offsetY) + "px";
        
        // 별의 크기도 랜덤하게 설정 (4px ~ 9px)
        const size = Math.random() * 5 + 4;
        star.style.width = size + "px";
        star.style.height = size + "px";

        // 애니메이션이 위로 흩어질 때 좌우로도 살짝 흔들리게 랜덤 변수 전달
        const tx = (Math.random() - 0.5) * 50 + "px";
        star.style.setProperty('--tx', tx);

        document.body.appendChild(star);

        // 1.5초(여운이 끝나는 시간) 뒤에 생성된 별무리 삭제
        setTimeout(() => {
            star.remove();
        }, 1500);
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
