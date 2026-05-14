// ==UserScript==
// @name        spam blocker
// @namespace   Violentmonkey Scripts
// @match       *://www.dogdrip.net/*
// @match       *://*.ruliweb.com/*
// @grant       none
// @version     1.38
// @author      jsq
// @description 2025. 5. 13. 오후 9:03:05
// ==/UserScript==

(function() {
    'use strict';

    // 필터링할 키워드 목록
    const keywords = [
        '백종원', '주호민', '가세연', '트럼프', '트황상', '더본', '한문철', '이세돌','뉴진스', '방시혁', '빅히트',
        '음주', '뺑소니', '쿠팡',  '삼성', '파업', '삼전',
        'snl', 'SNL', '영포티', '중국', '짱깨', '우크라', '자살', '슈카', '동남아', '의새', '다케시마', '독도', '충주',
        '빽보이', '빽다방', '그알', '알고싶다', 'ice', 'ICE', '사망', '앱스타인', '엡스타인', '이란',
        '오킹', '논란', '우왁굳', 'ㅇㅇㄱ', '굴단','페미', '왁타', '🦪', '차은우', '탈세', '협회', '담합',
        '연봉', '실수령', '퐁퐁', '월급', '전쟁', '이스라엘', 'ㅇㅎ', 'ㅎㅂ',
        ]; // 원하는 키워드로 수정

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

    // replaceKeywords용 키워드 목록
    const replaceKeywordsList = ['ㅇㅎ\\)', 'ㅎㅂ\\)', 'ㅇㅎ', '약후']; // 예: ['키워드3', '키워드4']
    
    // 키워드를 제거하거나 대체하는 함수 (신규)
    function replaceKeywords() {
        // 모든 span과 a 태그 가져오기
        const spans = document.querySelectorAll('span, a');
        spans.forEach(span => {
            let text = span.textContent;
            let lowerText = text.toLowerCase();
            // 키워드가 포함되어 있는지 확인
            if (replaceKeywordsList.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
                let newText = text;
                // 각 키워드를 '.....'로 치환
                replaceKeywordsList.forEach(keyword => {
                    const regex = new RegExp(keyword, 'gi');
                    newText = newText.replace(regex, '');
                });
                span.textContent = newText;
            }
        });
    }

    // 최초 실행
    filterSpans();
    //replaceKeywords();
})();
