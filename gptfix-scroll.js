// ==UserScript==
// @name         ChatGPT Keyboard Scroll Fix
// @namespace    js-chatgpt-keyboard-scroll-fix
// @version      4.1
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

    /*
     * 현재 스크롤 컨테이너에 필요한 설정이
     * 제대로 적용되어 있는지 검사하고,
     * 빠져 있으면 다시 적용한다.
     */
    function ensureScrollerPrepared() {
        const scroller = getScroller();

        if (!scroller) {
            return null;
        }

        if (scroller.getAttribute('tabindex') !== '-1') {
            scroller.setAttribute('tabindex', '-1');
        }

        if (scroller.style.outline !== 'none') {
            scroller.style.outline = 'none';
        }

        if (scroller.style.scrollBehavior !== 'smooth') {
            scroller.style.scrollBehavior = 'smooth';
        }

        return scroller;
    }

    /*
     * SPA 대화 전환 직후에는 React가 약간 늦게
     * scroll container를 교체하는 경우가 있으므로
     * 몇 차례 재검사한다.
     */
    function scheduleRepair() {
        ensureScrollerPrepared();

        setTimeout(ensureScrollerPrepared, 0);
        setTimeout(ensureScrollerPrepared, 50);
        setTimeout(ensureScrollerPrepared, 150);
        setTimeout(ensureScrollerPrepared, 300);
    }

    function restoreScrollFocus() {
        const scroller = ensureScrollerPrepared();

        if (!scroller) return false;

        scroller.focus({
            preventScroll: true
        });

        return document.activeElement === scroller;
    }

    /*
     * 실제 대화 문서 영역을 클릭했는지 판단.
     *
     * scroller.contains()를 우선 사용하고,
     * ChatGPT DOM이 약간 바뀌는 경우를 위해 main도 fallback.
     */
    function isConversationArea(target) {
        if (!(target instanceof Element)) return false;

        const scroller = getScroller();

        if (scroller && scroller.contains(target)) {
            return true;
        }

        return !!target.closest('main');
    }


    /*
     * 1. pointerdown
     *
     * 클릭이 시작되는 순간 현재 scroller 상태를 검사.
     * 특히 대화 전환 이후 새 DOM을 잡는 용도.
     */
    document.addEventListener('pointerdown', event => {
        scheduleRepair();
    }, true);


    /*
     * 2. click
     *
     * 사용자가 메시지 본문을 클릭했다면
     * 입력창에서 스크롤 문서로 포커스를 옮기려는 의도로 본다.
     */
    document.addEventListener('click', event => {
        const target = event.target;

        scheduleRepair();

        if (!(target instanceof Element)) return;

        // 입력창은 절대 포커스를 빼앗지 않는다.
        if (isInputElement(target)) return;

        // 버튼/링크를 누른 경우 해당 UI의 포커스를 존중.
        if (isInteractiveElement(target)) return;

        if (!isConversationArea(target)) return;

        /*
         * ChatGPT 자체 click/focus 처리가 끝난 다음
         * 스크롤 컨테이너로 포커스를 복구.
         */
        setTimeout(() => {
            restoreScrollFocus();
        }, 0);

        /*
         * React가 click 이후 DOM을 교체하는 특이 케이스 보정.
         */
        setTimeout(() => {
            const active = document.activeElement;

            if (
                active &&
                !isInputElement(active) &&
                !isInteractiveElement(active)
            ) {
                restoreScrollFocus();
            }
        }, 100);

    }, true);


    /*
     * 3. 입력창에서 포커스가 빠질 때
     *
     * 사용자가 입력을 끝내고 본문 쪽으로 이동하는 상황을
     * 보조적으로 감지한다.
     */
    document.addEventListener('focusout', event => {
        if (!isInputElement(event.target)) return;

        scheduleRepair();

    }, true);


    /*
     * 4. 키보드 스크롤
     *
     * 키를 누르는 바로 그 순간에도 검사한다.
     * 이것이 최종 안전장치.
     */
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

        // 입력 중에는 기존 키 동작 보존
        if (
            active &&
            active instanceof Element &&
            isInputElement(active)
        ) {
            return;
        }

        const scroller = ensureScrollerPrepared();
        if (!scroller) return;

        if (document.activeElement !== scroller) {
            scroller.focus({
                preventScroll: true
            });
        }

        /*
         * preventDefault 하지 않음.
         * 브라우저 기본 keyboard scrolling 사용.
         */

    }, true);


    /*
     * 최초 페이지 로딩
     */
    scheduleRepair();

    console.log(
        '%cChatGPT Keyboard Scroll Fix 2.1 active',
        'color:#10a37f;font-weight:bold'
    );

})();
