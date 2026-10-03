// ==UserScript==
// @name         ChatGPT Keyboard Scroll Fix
// @namespace    js-chatgpt-keyboard-scroll-fix
// @version      6.0
// @description  Restore native keyboard scrolling in ChatGPT
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const SCROLL_KEYS = new Set([
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' '
    ]);

    let repairTimers = [];
    let lastHref = location.href;


    // --------------------------------------------------
    // Element helpers
    // --------------------------------------------------

    function isInputElement(element) {
        if (!(element instanceof Element)) return false;

        return !!element.closest(
            'textarea,' +
            'input,' +
            'select,' +
            '[contenteditable="true"],' +
            '[role="textbox"]'
        );
    }

    function isInteractiveElement(element) {
        if (!(element instanceof Element)) return false;

        return !!element.closest(
            'button,' +
            'a,' +
            '[role="button"],' +
            '[role="menuitem"],' +
            '[role="option"]'
        );
    }


    // --------------------------------------------------
    // Find actual visible ChatGPT scroll container
    // --------------------------------------------------

    function getCurrentScroller() {
        const candidates = [
            ...document.querySelectorAll('.thread-scroll-container')
        ];

        if (candidates.length === 0) {
            return null;
        }

        if (candidates.length === 1) {
            return candidates[0];
        }

        let best = null;
        let bestScore = -Infinity;

        for (const el of candidates) {
            const rect = el.getBoundingClientRect();

            if (
                rect.width <= 10 ||
                rect.height <= 10
            ) {
                continue;
            }

            const style = getComputedStyle(el);

            if (
                style.display === 'none' ||
                style.visibility === 'hidden'
            ) {
                continue;
            }

            let score =
                rect.width * rect.height;

            if (
                rect.bottom > 0 &&
                rect.top < window.innerHeight
            ) {
                score += 1_000_000;
            }

            if (
                el.scrollHeight >
                el.clientHeight
            ) {
                score += 500_000;
            }

            if (el.closest('main')) {
                score += 250_000;
            }

            if (score > bestScore) {
                bestScore = score;
                best = el;
            }
        }

        return best || candidates[0];
    }


    // --------------------------------------------------
    // Apply original 2.0 behaviour
    // --------------------------------------------------

    function prepareScroller() {
        const scroller =
            getCurrentScroller();

        if (!scroller) {
            return null;
        }

        if (
            scroller.getAttribute('tabindex')
            !== '-1'
        ) {
            scroller.setAttribute(
                'tabindex',
                '-1'
            );
        }

        if (
            scroller.style.outline
            !== 'none'
        ) {
            scroller.style.outline =
                'none';
        }

        if (
            scroller.style.scrollBehavior
            !== 'smooth'
        ) {
            scroller.style.scrollBehavior =
                'smooth';
        }

        return scroller;
    }

    function focusScroller() {
        const scroller =
            prepareScroller();

        if (!scroller) {
            return false;
        }

        if (
            document.activeElement
            === scroller
        ) {
            return true;
        }

        scroller.focus({
            preventScroll: true
        });

        return (
            document.activeElement
            === scroller
        );
    }


    // --------------------------------------------------
    // Coalesced repair
    // --------------------------------------------------

    function cancelRepairTimers() {
        for (const timer of repairTimers) {
            clearTimeout(timer);
        }

        repairTimers = [];
    }

    function scheduleRepair(
        focus = false
    ) {
        /*
         * 여러 이벤트가 연속으로 발생해도
         * 이전 repair chain을 취소하고
         * 최신 요청 하나만 유지.
         */
        cancelRepairTimers();

        const delays = [
            0,
            60,
            180,
            450,
            900
        ];

        for (const delay of delays) {
            const timer =
                setTimeout(() => {

                    /*
                     * 이 순간 사용자가 입력 중이면
                     * 아무것도 하지 않는다.
                     */
                    if (
                        isInputElement(
                            document.activeElement
                        )
                    ) {
                        return;
                    }

                    if (focus) {
                        focusScroller();
                    } else {
                        prepareScroller();
                    }

                }, delay);

            repairTimers.push(timer);
        }
    }


    // --------------------------------------------------
    // Mouse interaction
    // --------------------------------------------------

    document.addEventListener(
        'click',
        event => {

            const target =
                event.target;

            if (
                !(target instanceof Element)
            ) {
                return;
            }

            /*
             * 입력창 클릭:
             * 완전히 무시.
             */
            if (isInputElement(target)) {
                return;
            }

            /*
             * 버튼 / 링크 클릭.
             *
             * 다른 채팅으로 이동한 것일 수 있으므로
             * 새 scroller가 생기는지만 재확인.
             * 포커스는 뺏지 않는다.
             */
            if (
                isInteractiveElement(target)
            ) {
                scheduleRepair(false);
                return;
            }

            const scroller =
                getCurrentScroller();

            /*
             * 대화 본문 클릭:
             * 사용자가 문서를 읽으려는 상황으로 보고
             * scroller에 포커스를 준다.
             */
            if (
                scroller &&
                scroller.contains(target)
            ) {
                scheduleRepair(true);
                return;
            }

            /*
             * React 전환 직후에는 contains가
             * 잠깐 실패할 수 있으므로 main 클릭도 허용.
             */
            if (
                target.closest('main')
            ) {
                scheduleRepair(true);
            }

        },
        true
    );


    // --------------------------------------------------
    // Keyboard
    // --------------------------------------------------

    window.addEventListener(
        'keydown',
        event => {

            /*
             * 스크롤 키가 아니면
             * 즉시 종료.
             *
             * 일반 문자 입력에는 아무 작업도 하지 않는다.
             */
            if (
                !SCROLL_KEYS.has(event.key)
            ) {
                return;
            }

            /*
             * 입력창이면 스크롤 키조차 건드리지 않는다.
             *
             * ↑↓로 프롬프트 편집하거나
             * Home/End 사용하는 것도 그대로 유지.
             */
            if (
                isInputElement(
                    document.activeElement
                )
            ) {
                return;
            }

            /*
             * 실제 스크롤 키를 누른 순간만
             * scroller focus를 보장.
             */
            focusScroller();

            /*
             * preventDefault() 없음.
             *
             * 이후 브라우저의 native keyboard scroll이
             * 자연스럽게 실행된다.
             */

        },
        true
    );


    // --------------------------------------------------
    // SPA navigation
    // --------------------------------------------------

    function handleRouteChange() {
        scheduleRepair(false);
    }

    const originalPushState =
        history.pushState;

    history.pushState =
        function (...args) {

            const result =
                originalPushState.apply(
                    this,
                    args
                );

            handleRouteChange();

            return result;
        };


    const originalReplaceState =
        history.replaceState;

    history.replaceState =
        function (...args) {

            const result =
                originalReplaceState.apply(
                    this,
                    args
                );

            handleRouteChange();

            return result;
        };


    window.addEventListener(
        'popstate',
        handleRouteChange
    );


    /*
     * Router가 history hook을 우회하는 상황에 대한
     * 아주 저렴한 fallback.
     *
     * DOM 검사는 안 하고 URL 문자열만 비교한다.
     */
    setInterval(() => {

        if (
            location.href === lastHref
        ) {
            return;
        }

        lastHref = location.href;

        handleRouteChange();

    }, 750);


    // --------------------------------------------------
    // Initial setup
    // --------------------------------------------------

    function boot() {
        if (!document.body) {
            requestAnimationFrame(boot);
            return;
        }

        scheduleRepair(false);
    }

    boot();

})();
