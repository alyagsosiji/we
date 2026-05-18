document.addEventListener("DOMContentLoaded", function () {
    const timelineItems = document.querySelectorAll(".timeline-item");

    function showItemsOnScroll() {
        const triggerBottom = window.innerHeight * 0.85; // 화면 아래에서 15% 올라왔을 때 감지

        timelineItems.forEach((item) => {
            const itemTop = item.getBoundingClientRect().top;

            if (itemTop < triggerBottom) {
                item.classList.add("visible");
            }
        });
    }

    // 페이지 로드 시 한 번 실행 후 스크롤할 때마다 실행
    showItemsOnScroll();
    window.addEventListener("scroll", showItemsOnScroll);
});