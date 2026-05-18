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
function checkPassword() {
    const input = document.getElementById("letter-password").value;
    const lockScreen = document.getElementById("lock-screen");
    const realContent = document.getElementById("letter-real-content");

    // 비밀번호 설정: 0416
    if (input === "0416") {
        lockScreen.style.display = "none";
        realContent.style.display = "block";
        
        // 폭죽 효과 대신 하트 콘솔 메시지 (선택 사항)
        console.log("사랑해 하은아! ❤️");
    } else {
        alert("비밀번호가 틀렸어! 우리만의 소중한 날짜를 입력해줘.");
        document.getElementById("letter-password").value = "";
    }
}
