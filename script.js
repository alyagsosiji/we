document.addEventListener("DOMContentLoaded", function () {
    const timelineItems = document.querySelectorAll(".timeline-item");

    // 화면에 나타나는 것을 더 부드럽게 감지하는 Observer 사용
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            // 카드가 화면 아래에서 15% 정도 보이기 시작할 때 클래스 추가
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, {
        threshold: 0.15 
    });

    // 모든 타임라인 카드에 관찰자 달아주기
    timelineItems.forEach((item) => {
        observer.observe(item);
    });
});
