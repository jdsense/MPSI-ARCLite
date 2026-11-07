# truck-twin.min.js 호스팅 안내 (v1.0.0, 2026-11-02)

트럭 적재 3D 트윈 렌더러 **단일 JS 파일**입니다. 이 폴더의 파일을 정적 웹 서버에 올리기만 하면 되고,
서버 쪽 코드·DB·로그인은 필요 없습니다. 사용자 **브라우저**가 이 서버에서 파일을 직접 내려받습니다.

| 파일 | 용도 |
|---|---|
| `truck-twin.min.js` | 호스팅할 파일 (필수, 약 600KB) |
| `truck-twin.min.js.sri` | 무결성 해시(`sha384-…`). 호출하는 쪽이 `<script integrity>` 를 쓸 때 참조 |
| `demo/index.html`, `demo/demo-key.js` | 호스팅 확인용 데모 페이지. 테스트 키 포함(어느 주소에서나 동작, **2026-12-02 만료**) |
| `README.md` | 이 문서 |

## 1. 파일 배치

- `truck-twin.min.js` 를 공개 URL 에 둡니다. 경로에 버전을 넣어 주세요. 예: `https://<호스트>/truck-twin/1.0.0/truck-twin.min.js`
  (나중에 교체할 때 캐시·무결성 문제가 생기지 않습니다.)
- **HTTPS 필수** — 호출하는 사이트가 HTTPS 라서 HTTP 스크립트는 브라우저가 차단합니다. 인증서는 공인 CA 발급이어야 합니다.
- `Content-Type: application/javascript; charset=utf-8`
- `?key=…` 쿼리가 붙어 와도 같은 파일을 주면 됩니다(정적 서버 기본 동작). CDN 이면 쿼리 무시 캐시를 켜 주세요.
- 인터넷에서 접근 가능해야 합니다(방화벽 인바운드 허용). 인증·쿠키·세션은 쓰지 않습니다.

## 2. 응답 헤더

| 헤더 | 값 | 비고 |
|---|---|---|
| `Cache-Control` | `public, max-age=31536000, immutable` | 버전 경로일 때. 버전 없는 경로면 `max-age=600` 정도 |
| `Content-Encoding` | gzip 또는 br | 600KB → 약 150KB |
| `Access-Control-Allow-Origin` | `*` | **호출 측이 무결성 고정(SRI)을 쓸 때만 필요.** 그 경우 이 헤더가 없으면 로드가 실패합니다. 쓰지 않으면 불필요 |

`X-Content-Type-Options: nosniff` 는 있어도 됩니다(그러면 Content-Type 이 정확해야 합니다). CSP·X-Frame-Options 는 무관합니다.

## 3. 파일 교체

- 새 버전은 **새 경로**에 올리고 URL 과 `truck-twin.min.js.sri` 값을 알려 주세요. 호출 측이 설정을 바꿔 반영합니다.
- 호출 측이 SRI 를 쓰는 동안 **같은 URL 의 파일을 덮어쓰지 마세요** — 해시가 달라져 즉시 로드가 실패합니다.
- 서버가 응답하지 않으면 호출 측 화면은 3D 대신 2D 로 자동 전환됩니다(15초 타임아웃). 모니터링은 URL 200 응답과 Content-Type 만 보면 됩니다.

## 4. 확인

```bash
curl -sI https://<호스트>/truck-twin/1.0.0/truck-twin.min.js | grep -i -E "^(HTTP|content-type|cache-control|content-encoding|access-control)"
```

`demo/` 폴더를 `truck-twin.min.js` 와 같은 위치에 올리고(`demo/index.html` 은 `../truck-twin.min.js` 를 읽습니다) 브라우저에서 열어
트럭과 적재 상자가 그려지고 드래그 회전·클릭 선택이 되면 끝입니다. 확인이 끝나면 `demo/` 는 지워도 됩니다(테스트 키는 2026-12-02 에 만료됩니다).

## 5. API 키

이 파일은 발급된 **API 키**가 있어야 그립니다. 검증(서명·사용 주소·만료)은 브라우저 안에서 이루어지며 서버와 통신하지 않습니다.
키 발급·만료 연장은 소프트러시가 담당하고, 호스팅 서버가 할 일은 없습니다. 접근 로그에 `?key=` 값이 남을 수 있는데, 키는 사용 주소(origin)에
묶여 있어 다른 사이트에서는 쓸 수 없습니다.

## 6. 사용 예 (참고 — 호출하는 쪽 코드)

```html
<div id="twin" style="height:520px"></div>
<script src="https://<호스트>/truck-twin/1.0.0/truck-twin.min.js?key=발급받은_키"></script>
<script>
  TruckTwin.create(document.getElementById("twin"), {
    truck: { label: "11톤-01", vehicleTypeName: "11톤", bedLengthMm: 9200, heightLimitMm: 4000,
             usableHeightMm: 2700, bedFloorHeightMm: 1200, topSupportMm: 100 },
    cargo: [ /* { key, compartment: "FRONT"|"REAR", stackOrder, label, lengthMm, loadHeightMm, colorIndex, detail: [...] } */ ],
    theme: "auto",
  });
</script>
```

문의: 소프트러시(주)
