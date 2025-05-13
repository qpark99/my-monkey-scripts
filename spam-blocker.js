// ==UserScript==
// @name        spam blocker
// @namespace   Violentmonkey Scripts
// @match       *://www.dogdrip.net/*
// @grant       none
// @version     1.0
// @author      jsq
// @description 2025. 5. 13. 오후 9:03:05
// ==/UserScript==

(function() {
    'use strict';

    // 필터링할 키워드 목록
    const keywords = ['백종원', '주호민']; // 원하는 키워드로 수정

    // span 요소를 필터링하는 함수
    function filterSpans() {
        // 모든 span 태그 가져오기
        const spans = document.querySelectorAll('span, a');
        spans.forEach(span => {
            let text = span.textContent.toLowerCase();
            // 키워드가 포함되어 있는지 확인
            if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
                span.textContent = '.....'; // 텍스트를 .....로 치환
            }
        });
    }

    // 최초 실행
    filterSpans();
})();
