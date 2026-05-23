const CACHE_NAME = 'we-v2'; // 코드가 대폭 수정되었으므로 버전을 v2로 격상합니다.
const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'style.css',
    'script.js',
    '하은.jpg',
    '블라우스_하은.jpg'
];

// 1. 서비스 워커 설치 및 자산 로컬 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// 2. 구버전 캐시 즉시 자동 청소
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. ⚡ 정밀 네트워크 인터셉터 (기존 JS 꼬임 및 오디오/mailto 버그 완벽 수정)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // [해결 1] GET 요청이 아니거나 http/https 프로토콜이 아니면 가로채지 않고 브라우저에 전권 위임
    // (이 처리가 없으면 mailto:atritime@... 링크나 확장 프로그램 작동 시 사이트가 멈춥니다)
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    // [해결 2] BGM 오디오 자산은 스트리밍(Range 206) 오류 방지를 위해 무조건 캐시를 우회하여 통과
    if (event.request.destination === 'audio' || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav')) {
        return;
    }

    // [해결 3] 핵심 코드 파일(html, js, css, 루트경로)은 '네트워크 우선, 실패 시 캐시 백업' 전략 적용
    // 이렇게 설계해야 수정 사항이 실시간으로 반영되어 코드가 꼬이지 않습니다.
    const isCoreAsset = url.pathname.endsWith('index.html') || 
                        url.pathname.endsWith('script.js') || 
                        url.pathname.endsWith('style.css') || 
                        url.pathname === '/' || 
                        url.pathname.endsWith('./');

    if (isCoreAsset) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // 온라인 상태일 때 받아온 최신 코드를 캐시에 업데이트 보관
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // 완전히 인터넷이 끊긴 오프라인 상태에서만 캐시 저장본으로 비상 구동
                    return caches.match(event.request);
                })
        );
    } else {
        // 이미지 등 대용량 정적 자산은 로딩 속도를 위해 기존대로 캐시 우선 처리
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                }).catch(() => {
                    // [에러 원인 차단] 예외 발생 시 undefined가 아닌 올바른 빈 Response 객체를 넘겨 붕괴 방지
                    return new Response('Offline Asset Unavailable', { status: 503, statusText: 'Service Unavailable' });
                });
            })
        );
    }
});
