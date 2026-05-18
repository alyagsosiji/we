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
