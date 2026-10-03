// ==UserScript==
// @name         ChatGPT Keyboard Scroll Fix
// @namespace    js-chatgpt-keyboard-scroll-fix
// @version      2.0
// @description  Restore native keyboard scrolling in ChatGPT
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function getScroller() {
        return document.querySelector('.thread-scroll-container');
    }

    function restoreScrollFocus() {
        const scroller = getScroller();
        if (!scroller) return false;

        // 키보드 포커스를 받을 수 있게 함
        if (!scroller.hasAttribute('tabindex')) {
            scroller.setAttribute('tabindex', '-1');
        }

        // 기본 outline 제거
        scroller.style.outline = 'none';

        // 브라우저 기본 스크롤을 약간 부드럽게
        scroller.style.scrollBehavior = 'smooth';

        scroller.focus({
            preventScroll: true
        });

        return true;
    }

    function isInputElement(element) {
        return !!element.closest(
            'textarea, input, select, [contenteditable="true"], [role="textbox"]'
        );
    }

    function isInteractiveElement(element) {
        return !!element.closest(
            'button, a, [role="button"], [role="menuitem"], [role="option"]'
        );
    }

    /*
     * 핵심:
     * ChatGPT 메시지 영역을 클릭하면 현재 버그 때문에
     * "Messages page" 같은 잘못된 컨테이너에 포커스가 감.
     *
     * 클릭 처리가 끝난 다음 실제 scroll container로
     * 포커스를 다시 옮긴다.
     */
    document.addEventListener('click', function (event) {
        const target = event.target;

        if (!(target instanceof Element)) return;

        // 입력창을 클릭했으면 절대 포커스를 뺏지 않음
        if (isInputElement(target)) return;

        // 버튼, 링크 등을 클릭했을 때도 건드리지 않음
        if (isInteractiveElement(target)) return;

        const scroller = getScroller();
        if (!scroller) return;

        // 실제 대화 영역을 클릭했을 때만
        if (!scroller.contains(target)) return;

        // ChatGPT 자체 click/focus 처리가 끝난 뒤 실행
        setTimeout(() => {
            restoreScrollFocus();
        }, 0);

    }, true);


    /*
     * 혹시 ChatGPT가 키 입력 직전에 이상한
     * Messages page에 포커스를 잡아놓은 경우를 위한 보정.
     */
    window.addEventListener('keydown', function (event) {

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

        // 실제로 글을 입력하고 있다면 건드리지 않는다.
        if (
            active &&
            active instanceof Element &&
            isInputElement(active)
        ) {
            return;
        }

        const scroller = getScroller();

        if (
            scroller &&
            document.activeElement !== scroller
        ) {
            restoreScrollFocus();
        }

        /*
         * preventDefault() 하지 않는다.
         *
         * 브라우저가 원래 가지고 있는
         * ↑↓ / PgUp / PgDn / Space / Home / End
         * 동작을 그대로 사용하게 한다.
         */

    }, true);


    /*
     * SPA라서 페이지 이동 후 DOM이 바뀔 수 있으므로
     * 최초 로딩 때 한번 준비.
     */
    function init() {
        const scroller = getScroller();

        if (!scroller) {
            setTimeout(init, 500);
            return;
        }

        scroller.setAttribute('tabindex', '-1');
        scroller.style.outline = 'none';
        scroller.style.scrollBehavior = 'smooth';

        console.log(
            '%cChatGPT Keyboard Scroll Fix active',
            'color:#10a37f;font-weight:bold'
        );
    }

    init();

})();
