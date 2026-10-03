// ==UserScript==
// @name         ChatGPT Keyboard Scroll Fix
// @namespace    js-chatgpt-keyboard-scroll-fix
// @version      3.0
// @description  Restore native keyboard scrolling in ChatGPT
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    let currentScroller = null;

    function getScroller() {
        return document.querySelector('.thread-scroll-container');
    }

    function setupScroller() {
        const scroller = getScroller();

        if (!scroller) return;

        // 이미 현재 컨테이너를 초기화했다면 아무것도 안 함
        if (scroller === currentScroller) return;

        currentScroller = scroller;

        scroller.setAttribute('tabindex', '-1');
        scroller.style.outline = 'none';
        scroller.style.scrollBehavior = 'smooth';

        console.log('ChatGPT scroll container initialized');
    }

    function restoreScrollFocus() {
        setupScroller();

        const scroller = getScroller();
        if (!scroller) return;

        scroller.focus({
            preventScroll: true
        });
    }

    function isInputElement(element) {
        if (!(element instanceof Element)) return false;

        return !!element.closest(
            'textarea, input, select, [contenteditable="true"], [role="textbox"]'
        );
    }

    function isInteractiveElement(element) {
        if (!(element instanceof Element)) return false;

        return !!element.closest(
            'button, a, [role="button"], [role="menuitem"], [role="option"]'
        );
    }

    // 대화 본문 클릭 시 스크롤 컨테이너에 포커스 복원
    document.addEventListener('click', event => {
        const target = event.target;

        if (!(target instanceof Element)) return;
        if (isInputElement(target)) return;
        if (isInteractiveElement(target)) return;

        const scroller = getScroller();
        if (!scroller) return;
        if (!scroller.contains(target)) return;

        setTimeout(() => {
            restoreScrollFocus();
        }, 0);

    }, true);


    // 키보드 스크롤
    window.addEventListener('keydown', event => {

        const keys = [
            'ArrowUp',
            'ArrowDown',
            'PageUp',
            'PageDown',
            'Home',
            'End',
            ' '
        ];

        if (!keys.includes(event.key)) return;

        const active = document.activeElement;

        // 입력 중이면 기본 키 동작 유지
        if (active && isInputElement(active)) {
            return;
        }

        setupScroller();

        const scroller = getScroller();
        if (!scroller) return;

        if (document.activeElement !== scroller) {
            scroller.focus({
                preventScroll: true
            });
        }

        // preventDefault 하지 않음
        // 브라우저 기본 키보드 스크롤을 그대로 사용
    }, true);


    /*
     * 핵심 부분.
     *
     * ChatGPT는 SPA라 대화 이동 시 DOM을 통째로 교체함.
     * 새 scroll container가 생기면 자동으로 다시 setup.
     */
    const observer = new MutationObserver(() => {
        setupScroller();
    });

    function startObserver() {
        if (!document.body) {
            requestAnimationFrame(startObserver);
            return;
        }

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setupScroller();

        console.log('ChatGPT Keyboard Scroll Fix active');
    }

    startObserver();

})();
