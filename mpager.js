// ==UserScript==
// @name         스크롤 확장 (Scroll Enhancer)
// @namespace    http://tampermonkey.net/
// @version      1.9 // 버전 업데이트
// @description  아이패드/PC 환경에서 페이지 단위로 부드럽게 스크롤하는 버튼과 설정 기능을 제공합니다. (주요 스크롤 요소 또는 메인 윈도우 스크롤)
// @author       Gemini
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // UI 색상 및 투명도 설정 상수
    const UI_COLORS = {
        // 메인 스크롤 버튼 (위/아래)
        primaryButtonBg: '173, 216, 230', // 연한 하늘색 (RGB)
        primaryButtonOpacity: 0.3,       // 기본 투명도 (30%)
        primaryButtonHoverOpacity: 0.5,  // 호버 시 투명도 (50%)

        // 설정 버튼 (톱니바퀴)
        settingsButtonBg: '169, 169, 169', // 중간 회색 (RGB)
        settingsButtonOpacity: 0.8,      // 기본 투명도 (30%)
        settingsButtonHoverOpacity: 0.8, // 호버 시 투명도 (50%)

        // 설정 메뉴 배경
        settingsMenuBg: '255, 255, 255', // 흰색 (RGB)
        settingsMenuOpacity: 1.0,       // 메뉴 배경 투명도 (60%)

        // 설정 메뉴 옵션 호버/선택 배경
        optionHoverBg: '240, 240, 240', // 연한 회색 (RGB)
        optionHoverOpacity: 0.7,       // 호버 시 투명도 (70%)

        optionSelectedBg: '224, 224, 224', // 약간 더 진한 연한 회색 (RGB)
        optionSelectedOpacity: 1.0,      // 선택 시 투명도 (70%)
    };

    // 스크롤 양 설정 옵션 정의
    const SCROLL_OPTIONS = [
        { text: '90% 화면', percentage: 0.9 },
        { text: '80% 화면', percentage: 0.8 },
        { text: '70% 화면', percentage: 0.7 },
        { text: '60% 화면', percentage: 0.6 }
    ];

    // 글자 크기 설정 옵션 정의
    const FONT_SIZE_OPTIONS = [
        { text: '기본 크기 (100%)', size: '100%' },
        { text: '크게 (110%)', size: '110%' },
        { text: '더 크게 (120%)', size: '120%' },
        { text: '아주 크게 (130%)', size: '130%' }
    ];

    // 로컬 스토리지 키 정의 (도메인별로 저장)
    const scrollPercentageKey = `scroll_enhancer_percentage_${window.location.hostname}`;
    const fontSizeKey = `font_enhancer_size_${window.location.hostname}`;

    // 현재 스크롤 양 설정 (기본값 또는 저장된 값 로드)
    let currentScrollPercentage = parseFloat(localStorage.getItem(scrollPercentageKey));
    if (isNaN(currentScrollPercentage) || !SCROLL_OPTIONS.some(opt => opt.percentage === currentScrollPercentage)) {
        currentScrollPercentage = SCROLL_OPTIONS[0].percentage; // 첫 번째 옵션 (90%)을 기본값으로
    }

    // 현재 글자 크기 설정 (기본값 또는 저장된 값 로드)
    let currentFontSize = localStorage.getItem(fontSizeKey);
    if (!currentFontSize || !FONT_SIZE_OPTIONS.some(opt => opt.size === currentFontSize)) {
        currentFontSize = FONT_SIZE_OPTIONS[0].size; // 첫 번째 옵션 (100%)을 기본값으로
    }

    // 스크롤 대상 요소 (초기값은 문서의 루트 요소)
    let targetScrollElement = document.documentElement; // 기본적으로 window 스크롤 (document.documentElement)

    /**
     * 웹페이지 내에서 주요 스크롤 가능한 요소를 찾습니다.
     * "아주 크고 가장 바깥 뎁스"의 요소를 우선하며, 탐색 깊이를 제한합니다.
     * @param {number} maxDepth - DOM 탐색의 최대 깊이 제한. (기본값 10으로 조정)
     * @returns {HTMLElement} 찾은 스크롤 가능한 요소 또는 document.documentElement (메인 윈도우).
     */
    function findPrimaryScrollableElement(maxDepth = 10) {
        let bestCandidate = null;
        let maxScrollableHeight = 0; // 가장 큰 스크롤 가능한 높이를 가진 요소를 찾기 위함

        // Breadth-First Search (BFS)를 위한 큐
        const queue = [{ element: document.body, depth: 0 }];

        while (queue.length > 0) {
            const { element, depth } = queue.shift();

            // 최대 탐색 깊이 초과 시 건너뛰기
            if (depth > maxDepth) {
                continue;
            }

            // 요소가 실제로 스크롤 가능한지 확인
            // scrollHeight > clientHeight: 요소의 전체 콘텐츠 높이가 보이는 영역보다 큰 경우
            // clientHeight > 0: 요소가 실제로 화면에 보이고 높이를 가지고 있는 경우
            // getComputedStyle: overflow 속성을 확인하여 명시적으로 스크롤 가능한지 판단
            const computedStyle = window.getComputedStyle(element);
            const isScrollable = element.scrollHeight > element.clientHeight &&
                                 (computedStyle.overflowY === 'scroll' || computedStyle.overflowY === 'auto' ||
                                  computedStyle.overflowX === 'scroll' || computedStyle.overflowX === 'auto');

            if (isScrollable) {
                // "아주 큰" 요소를 판단하는 기준:
                // 1. 스크롤 가능한 콘텐츠의 양이 뷰포트 높이의 절반 이상
                // 2. 요소 자체의 보이는 높이가 뷰포트 높이의 절반 이상
                const scrollableContentDiff = element.scrollHeight - element.clientHeight;
                if (scrollableContentDiff > window.innerHeight * 0.5 && element.clientHeight > window.innerHeight * 0.5) {
                    // 현재까지 찾은 가장 큰 스크롤 가능한 요소를 업데이트
                    if (scrollableContentDiff > maxScrollableHeight) {
                        bestCandidate = element;
                        maxScrollableHeight = scrollableContentDiff;
                    }
                }
            }

            // 자식 요소들을 큐에 추가하여 다음 깊이 탐색
            for (let i = 0; i < element.children.length; i++) {
                queue.push({ element: element.children[i], depth: depth + 1 });
            }
        }

        // 가장 적합한 요소를 찾지 못했다면, 문서의 루트 요소(메인 윈도우)를 반환
        return bestCandidate || document.documentElement;
    }

    // UI 요소 생성
    function createUI() {
        // 스타일 주입
        const style = document.createElement('style');
        style.textContent = `
            /* 스크롤 버튼 컨테이너 */
            #scrollEnhancerContainer {
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                align-items: flex-end; /* 설정 메뉴가 오른쪽 정렬되도록 */
                z-index: 9999;
                font-family: 'Inter', sans-serif; /* 폰트 설정 */
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            /* 공통 버튼 스타일 */
            .scroll-enhancer-button {
                background-color: rgba(${UI_COLORS.primaryButtonBg}, ${UI_COLORS.primaryButtonOpacity});
                color: rgba(255, 255, 255, ${UI_COLORS.primaryButtonOpacity}); /* 텍스트 색상도 투명도 적용 */
                border: none;
                border-radius: 8px; /* 둥근 모서리 */
                width: 48px;
                height: 48px;
                font-size: 24px;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                transition: background-color 0.2s ease, transform 0.2s ease, opacity 0.3s ease; /* opacity 추가 */
                margin-top: 10px; /* 버튼 간 간격 */
                -webkit-tap-highlight-color: transparent; /* 탭 시 하이라이트 제거 */
            }

            .scroll-enhancer-button:hover {
                background-color: rgba(${UI_COLORS.primaryButtonBg}, ${UI_COLORS.primaryButtonHoverOpacity});
                color: rgba(255, 255, 255, ${UI_COLORS.primaryButtonHoverOpacity}); /* 호버 시 텍스트 색상 투명도 적용 */
                transform: translateY(-2px); /* 살짝 위로 */
            }

            .scroll-enhancer-button:active {
                transform: translateY(0); /* 클릭 시 원위치 */
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            /* 설정 버튼 */
            #settingsButton {
                background-color: rgba(${UI_COLORS.settingsButtonBg}, ${UI_COLORS.settingsButtonOpacity});
            }

            #settingsButton:hover {
                background-color: rgba(${UI_COLORS.settingsButtonBg}, ${UI_COLORS.settingsButtonHoverOpacity});
            }

            /* 설정 메뉴 */
            #settingsMenu {
                background-color: rgba(${UI_COLORS.settingsMenuBg}, ${UI_COLORS.settingsMenuOpacity});
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
                padding: 10px;
                margin-bottom: 10px; /* 버튼과의 간격 */
                display: none; /* 기본적으로 숨김 */
                flex-direction: column;
                align-items: flex-start;
                opacity: 0;
                transform: translateY(10px);
                transition: opacity 0.3s ease, transform 0.3s ease;
                min-width: 150px; /* 메뉴 최소 너비 */
            }

            #settingsMenu.show {
                display: flex;
                opacity: 1;
                transform: translateY(0);
            }

            .setting-section-title {
                font-weight: bold;
                margin-top: 5px;
                margin-bottom: 5px;
                color: #555;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding-left: 5px;
            }

            .setting-option {
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 6px;
                width: 100%;
                text-align: left;
                color: #333; /* 텍스트 색상은 투명도와 별개로 유지 */
                font-size: 16px;
                transition: background-color 0.2s ease;
            }

            .setting-option:hover {
                background-color: rgba(${UI_COLORS.optionHoverBg}, ${UI_COLORS.optionHoverOpacity});
            }

            .setting-option.selected {
                background-color: rgba(${UI_COLORS.optionSelectedBg}, ${UI_COLORS.optionSelectedOpacity});
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);

        // 메인 컨테이너
        const container = document.createElement('div');
        container.id = 'scrollEnhancerContainer';
        document.body.appendChild(container);

        // 설정 메뉴
        const settingsMenu = document.createElement('div');
        settingsMenu.id = 'settingsMenu';
        container.appendChild(settingsMenu);

        // 스크롤 단위 섹션
        const scrollSectionTitle = document.createElement('div');
        scrollSectionTitle.className = 'setting-section-title';
        scrollSectionTitle.textContent = '스크롤 단위';
        settingsMenu.appendChild(scrollSectionTitle);

        SCROLL_OPTIONS.forEach(optionData => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'setting-option scroll-option'; // 클래스 추가
            optionDiv.textContent = optionData.text;
            optionDiv.dataset.percentage = optionData.percentage.toString();
            settingsMenu.appendChild(optionDiv);
            optionDiv.addEventListener('click', selectScrollPercentage);
        });

        // 글자 크기 섹션
        const fontSizeSectionTitle = document.createElement('div');
        fontSizeSectionTitle.className = 'setting-section-title';
        fontSizeSectionTitle.textContent = '글자 크기';
        settingsMenu.appendChild(fontSizeSectionTitle);

        FONT_SIZE_OPTIONS.forEach(optionData => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'setting-option font-size-option'; // 클래스 추가
            optionDiv.textContent = optionData.text;
            optionDiv.dataset.size = optionData.size;
            settingsMenu.appendChild(optionDiv);
            optionDiv.addEventListener('click', selectFontSize);
        });

        // 초기 선택 상태 설정
        updateSelectedOption();

        // 설정 버튼
        const settingsButton = document.createElement('button');
        settingsButton.id = 'settingsButton';
        settingsButton.className = 'scroll-enhancer-button';
        settingsButton.innerHTML = '&#9881;'; // ⚙️ 톱니바퀴 아이콘
        container.appendChild(settingsButton);

        // 위로 스크롤 버튼
        const scrollUpButton = document.createElement('button');
        scrollUpButton.id = 'scrollUpButton';
        scrollUpButton.className = 'scroll-enhancer-button';
        scrollUpButton.innerHTML = '&#9650;'; // ▲ 위 화살표
        container.appendChild(scrollUpButton);

        // 아래로 스크롤 버튼
        const scrollDownButton = document.createElement('button');
        scrollDownButton.id = 'scrollDownButton';
        scrollDownButton.className = 'scroll-enhancer-button';
        scrollDownButton.innerHTML = '&#9660;'; // ▼ 아래 화살표
        container.appendChild(scrollDownButton);

        // 이벤트 리스너 추가
        settingsButton.addEventListener('click', toggleSettingsMenu);
        scrollDownButton.addEventListener('click', () => scrollPage(1));
        scrollUpButton.addEventListener('click', () => scrollPage(-1));

        // 설정 메뉴 외부 클릭 시 닫기
        document.addEventListener('click', (event) => {
            if (!container.contains(event.target) && settingsMenu.classList.contains('show')) {
                settingsMenu.classList.remove('show');
            }
        });

        // UI 생성 후 스크롤 대상 요소 찾기
        targetScrollElement = findPrimaryScrollableElement();
        console.log('스크롤 대상 요소:', targetScrollElement === document.documentElement ? '메인 윈도우' : targetScrollElement);

        // 스크롤 이벤트 리스너 추가 및 초기 가시성 설정
        const scrollElement = targetScrollElement === document.documentElement ? window : targetScrollElement;
        scrollElement.addEventListener('scroll', handleSettingsButtonVisibility);
        handleSettingsButtonVisibility(); // 초기 로드 시 가시성 설정

        // 페이지 로드 시 저장된 글자 크기 적용
        applyFontSize(currentFontSize);
    }

    // 스크롤 양 설정 메뉴 토글
    function toggleSettingsMenu() {
        const settingsMenu = document.getElementById('settingsMenu');
        settingsMenu.classList.toggle('show');
    }

    // 스크롤 양 선택
    function selectScrollPercentage(event) {
        currentScrollPercentage = parseFloat(event.target.dataset.percentage);
        localStorage.setItem(scrollPercentageKey, currentScrollPercentage.toString()); // localStorage에 저장
        updateSelectedOption();
        toggleSettingsMenu(); // 선택 후 메뉴 닫기
    }

    // 글자 크기 선택 및 적용
    function selectFontSize(event) {
        currentFontSize = event.target.dataset.size;
        localStorage.setItem(fontSizeKey, currentFontSize); // localStorage에 저장
        applyFontSize(currentFontSize);
        updateSelectedOption();
        toggleSettingsMenu(); // 선택 후 메뉴 닫기
    }

    // 선택된 스크롤 양 및 글자 크기 옵션 UI 업데이트
    function updateSelectedOption() {
        // 스크롤 옵션 업데이트
        const scrollOptions = document.querySelectorAll('#settingsMenu .scroll-option');
        scrollOptions.forEach(option => {
            if (parseFloat(option.dataset.percentage) === currentScrollPercentage) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });

        // 글자 크기 옵션 업데이트
        const fontSizeOptions = document.querySelectorAll('#settingsMenu .font-size-option');
        fontSizeOptions.forEach(option => {
            if (option.dataset.size === currentFontSize) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    // 글자 크기 적용 함수
    function applyFontSize(size) {
        document.documentElement.style.fontSize = size;
    }

    // 설정 버튼 가시성 제어
    function handleSettingsButtonVisibility() {
        const settingsButton = document.getElementById('settingsButton');
        const scrollTop = targetScrollElement === document.documentElement ? window.scrollY : targetScrollElement.scrollTop;

        if (scrollTop === 0) {
            settingsButton.style.opacity = '1';
            settingsButton.style.pointerEvents = 'auto'; // 클릭 가능
        } else {
            settingsButton.style.opacity = '0';
            settingsButton.style.pointerEvents = 'none'; // 클릭 불가능
            // 스크롤 시 설정 메뉴가 열려있다면 닫기
            const settingsMenu = document.getElementById('settingsMenu');
            if (settingsMenu.classList.contains('show')) {
                settingsMenu.classList.remove('show');
            }
        }
    }

    // 페이지 스크롤 함수
    function scrollPage(direction) { // direction: 1 for down, -1 for up
        const scrollAmount = window.innerHeight * currentScrollPercentage;

        // 찾은 스크롤 대상 요소가 있다면 해당 요소를 스크롤, 없으면 메인 윈도우 스크롤
        if (targetScrollElement && targetScrollElement !== document.documentElement) {
            targetScrollElement.scrollBy({
                top: scrollAmount * direction,
                behavior: 'smooth' // 부드러운 스크롤 유지
            });
        } else {
            window.scrollBy({
                top: scrollAmount * direction,
                behavior: 'smooth' // 부드러운 스크롤 유지
            });
        }
    }

    // DOMContentLoaded 이벤트 발생 시 UI 생성
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUI);
    } else {
        createUI();
    }
})();
