// ==UserScript==
// @name        spam blocker
// @namespace   Violentmonkey Scripts
// @match       *://www.dogdrip.net/*
// @match       *://*.ruliweb.com/*
// @grant       none
// @version     1.64
// @author      jsq
// @description 2025. 5. 13. 오후 9:03:05
// ==/UserScript==

(function() {
    'use strict';

    // 판(board) 단위 차단 — 키워드가 아니라 '출처'로 막는다.
    // dogdrip 판의 URL 조각을 넣으면 그 판의 메인 위젯과 상단 메뉴 항목이 통째로 사라진다.
    // 제목 문자열을 안 보므로 오차단이 구조적으로 0이고, CSS :has()라 나중에 로딩되는 영역에도 자동 적용된다.
    const blockedBoards = ['stock', 'coin'];

    function blockBoards() {
        if (!blockedBoards.length) return;
        // 위젯은 중첩된다 — '게임 판' 위젯이 하위 위젯 20여 개를 품는 식.
        // :has()는 자손 어디에나 걸리므로 제목 링크의 깊이(> div > .widget-title)를 고정해야
        // 바깥 컨테이너가 통째로 사라지는 사고를 막는다.
        const sel = blockedBoards.flatMap(b => [
            `.xe-widget-wrapper:has(> div > .widget-title a[href="${b}"])`,   // 메인 위젯 (제목 링크가 상대경로)
            `.xe-widget-wrapper:has(> div > .widget-title a[href="/${b}"])`,
            `li:has(> a[href="/${b}"])`                                       // 상단 네비게이션 메뉴 항목
        ]).join(', ');
        const style = document.createElement('style');
        style.textContent = `${sel} { display: none !important; }`;
        (document.head || document.documentElement).appendChild(style);
    }

    // 필터링할 키워드 목록
    const keywords = [
        '백종원', '주호민', '가세연', '트럼프', '트황상', '더본', '한문철', '뉴진스', '방시혁', '빅히트',
        '뺑소니', '삼전', '스벅', '스타벅스', '정용진', '일베', 'snl', '영포티', '짱깨', '우크라',
        '슈카', '의새', '다케시마', '빽보이', '빽다방', '그알', '알고싶다', '앱스타인', '엡스타인', '오킹',
        '논란', '우왁굳', '굴단', '페미', '왁타', '차은우', '탈세', '담합', '실수령', '퐁퐁',
        '이스라엘', '선관위', '투표용지', '개표', '투표소', '전한길', '모스탄', '윤어게인', '허위조작정보', '탱크데이',
        '멸공', '환율', '코스피', '안협소', '시위', 'MBC', '투표율', '미실현', '주식', '폭락',
        '홍명보', '홍감독', '클린스만', '황선홍', '이임생', '축협', '몽규', '배재고', '김호중', '피카소',
        '난임병원', '레버리지', '구마모토', '쿠마모토', '이온몰', '인권법', '하닉', '혐한', '일뽕', '나노하',
        '돌려차기', '미장', '성접대', '그래미', '증시', '종부세', '친일', '이완용', '안상호', '민영화',
        '마이크론', '박위', '위라클', '장미란', '전현무', '박수홍', '부정선거', '양구', '스토크스', '스톡스',
        '부정수급', '야차룰', '배그', '배틀그라운', 'PUBG', '펍지', '크래프톤', '백억커피', '베트남', '아시안',
        '뿌요뿌요', '아겜', '사회인', '곽빈', 'BYD', '금메달', '닛몰', 'DMZ', '지뢰', '창신',
        '유출범', '병역', '군면제', '보충역', '국방부',
        ]; // 원하는 키워드로 수정

    // 복합 규칙(보조 옵션): 한 제목에 배열의 단어가 "모두" 있을 때만 차단.
    // 기본은 단일 키워드 확대이며, 특정 단어가 너무 광범위해 좁히고 싶을 때만 여기에 추가한다.
    const rules = [
        // 예: ['시위', '국적'] → 둘 다 포함시 차단
        ];

    // span 요소를 필터링하는 함수
    function filterSpans() {
        // 모든 span 태그 가져오기
        const spans = document.querySelectorAll('span, a');
        spans.forEach(span => {
            let text = span.textContent.toLowerCase();
            // 단일 키워드 포함 OR 복합 규칙(단어 전부 포함) 확인
            if (keywords.some(keyword => text.includes(keyword.toLowerCase())) ||
                rules.some(rule => rule.every(word => text.includes(word.toLowerCase())))) {
                span.textContent = '.....'; // 텍스트를 .....로 치환
            }
        });
    }

    // 최초 실행
    blockBoards();
    filterSpans();
})();
