// ==UserScript==
// @name         ChatGPT Keyboard Scroll Fix DEBUG
// @namespace    js-chatgpt-keyboard-scroll-fix
// @version      5.0
// @description  Restore native keyboard scrolling in ChatGPT + detailed debugging
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const PREFIX = '[GPT-SCROLL]';

    let lastHref = location.href;
    let repairSequence = 0;

    function log(...args) {
        console.log(
            '%c' + PREFIX,
            'color:#10a37f;font-weight:bold',
            ...args
        );
    }

    function describeElement(el) {
        if (!el) return 'null';

        if (!(el instanceof Element)) {
            return String(el);
        }

        let result = el.tagName.toLowerCase();

        if (el.id) {
            result += '#' + el.id;
        }

        if (el.classList?.length) {
            result += '.' + [...el.classList]
                .slice(0, 4)
                .join('.');
        }

        const role = el.getAttribute('role');

        if (role) {
            result += `[role="${role}"]`;
        }

        return result;
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
            'button, a, select, [role="button"], [role="menuitem"], [role="option"]'
        );
    }

    /*
     * querySelector 하나만 믿지 않는다.
     *
     * 채팅 전환 도중 old/new scroll container가
     * 동시에 존재할 가능성이 있으므로 전부 검사한다.
     */
    function getScrollerCandidates() {
        return [
            ...document.querySelectorAll('.thread-scroll-container')
        ];
    }

    function getVisibilityInfo(el) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);

        const visible =
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity || '1') > 0 &&
            rect.width > 10 &&
            rect.height > 10 &&
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth;

        return {
            visible,
            rect,
            style
        };
    }

    /*
     * 현재 화면에서 실제 사용 중인 scroller 선정.
     *
     * 보이는 것 + 화면 면적 + scroll 가능 여부에 점수를 준다.
     */
    function getCurrentScroller(reason = '') {
        const candidates = getScrollerCandidates();

        if (!candidates.length) {
            log(
                'SCROLLER NOT FOUND',
                'reason=', reason,
                'url=', location.pathname
            );

            return null;
        }

        const scored = candidates.map((el, index) => {
            const info = getVisibilityInfo(el);

            let score = 0;

            if (info.visible) {
                score += 1000000;
            }

            score += info.rect.width * info.rect.height;

            if (el.scrollHeight > el.clientHeight) {
                score += 500000;
            }

            if (el.closest('main')) {
                score += 250000;
            }

            return {
                el,
                index,
                score,
                visible: info.visible,
                rect: info.rect,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight
            };
        });

        scored.sort((a, b) => b.score - a.score);

        const selected = scored[0];

        log(
            `getCurrentScroller("${reason}")`,
            'count=', candidates.length,
            'selected=', selected.index,
            'visible=', selected.visible,
            'size=',
            Math.round(selected.rect.width) + 'x' +
            Math.round(selected.rect.height),
            'scroll=',
            selected.scrollHeight + '/' +
            selected.clientHeight
        );

        /*
         * 후보가 둘 이상이면 상세 로그.
         * 이게 이번 문제를 찾는 데 중요함.
         */
        if (candidates.length > 1) {
            console.table(
                scored.map(item => ({
                    index: item.index,
                    selected: item === selected,
                    visible: item.visible,
                    width: Math.round(item.rect.width),
                    height: Math.round(item.rect.height),
                    scrollHeight: item.scrollHeight,
                    clientHeight: item.clientHeight,
                    score: Math.round(item.score)
                }))
            );
        }

        return selected.el;
    }

    /*
     * 2.0에서 정상 동작했던 설정을 그대로 적용.
     */
    function prepareScroller(reason = '') {
        const scroller = getCurrentScroller(reason);

        if (!scroller) {
            return null;
        }

        const before = {
            tabindex: scroller.getAttribute('tabindex'),
            outline: scroller.style.outline,
            scrollBehavior: scroller.style.scrollBehavior
        };

        let changed = false;

        if (scroller.getAttribute('tabindex') !== '-1') {
            scroller.setAttribute('tabindex', '-1');
            changed = true;
        }

        if (scroller.style.outline !== 'none') {
            scroller.style.outline = 'none';
            changed = true;
        }

        if (scroller.style.scrollBehavior !== 'smooth') {
            scroller.style.scrollBehavior = 'smooth';
            changed = true;
        }

        log(
            changed ? 'PREPARED scroller' : 'scroller already prepared',
            'reason=', reason,
            'before=', before,
            'connected=', scroller.isConnected
        );

        return scroller;
    }

    /*
     * 단순히 속성을 넣는 것에서 끝내지 않고
     * 실제 focus 성공 여부까지 확인.
     */
    function focusScroller(reason = '') {
        const scroller = prepareScroller(reason);

        if (!scroller) {
            log(
                'FOCUS FAILED: no scroller',
                'reason=', reason
            );

            return false;
        }

        const before = document.activeElement;

        try {
            scroller.focus({
                preventScroll: true
            });
        } catch (error) {
            log(
                'focus() threw',
                error
            );

            return false;
        }

        const success =
            document.activeElement === scroller;

        log(
            success
                ? 'FOCUS SUCCESS'
                : 'FOCUS FAILED',
            'reason=', reason,
            'before=', describeElement(before),
            'after=', describeElement(document.activeElement),
            'scroller=', describeElement(scroller),
            'connected=', scroller.isConnected
        );

        /*
         * React 이벤트가 뒤에서 focus를 다시 뺏어가는지
         * 한 프레임 뒤에도 확인.
         */
        requestAnimationFrame(() => {
            log(
                'FOCUS CHECK (next frame)',
                'reason=', reason,
                'active=', describeElement(document.activeElement),
                'stillScroller=',
                document.activeElement === scroller,
                'scrollerConnected=',
                scroller.isConnected
            );
        });

        return success;
    }

    /*
     * DOM 교체 타이밍을 잡기 위한 재검사.
     *
     * 이벤트 발생 직후부터 1.2초까지 확인한다.
     */
    function scheduleRepair(reason, shouldFocus = false) {
        const sequence = ++repairSequence;

        const delays = [
            0,
            30,
            80,
            150,
            300,
            600,
            1200
        ];

        log(
            'SCHEDULE',
            '#' + sequence,
            'reason=', reason,
            'focus=', shouldFocus,
            'active=', describeElement(document.activeElement)
        );

        for (const delay of delays) {
            setTimeout(() => {
                log(
                    'RUN',
                    '#' + sequence,
                    `+${delay}ms`,
                    'reason=', reason,
                    'active=', describeElement(document.activeElement)
                );

                if (shouldFocus) {
                    focusScroller(`${reason} +${delay}ms`);
                } else {
                    prepareScroller(`${reason} +${delay}ms`);
                }
            }, delay);
        }
    }

    function isConversationArea(target) {
        if (!(target instanceof Element)) {
            return false;
        }

        const scroller = getCurrentScroller('isConversationArea');

        if (scroller && scroller.contains(target)) {
            return true;
        }

        /*
         * scroller 교체 직후 contains()가 실패할 경우를 위해
         * main 내부 일반 문서 클릭도 허용.
         */
        if (
            target.closest('main') &&
            !isInputElement(target) &&
            !isInteractiveElement(target)
        ) {
            return true;
        }

        return false;
    }


    // --------------------------------------------------
    // Mouse / pointer events
    // --------------------------------------------------

    function logPointerEvent(event) {
        log(
            'EVENT',
            event.type,
            'target=', describeElement(event.target),
            'active=', describeElement(document.activeElement),
            'x=', event.clientX,
            'y=', event.clientY
        );
    }

    document.addEventListener('pointerdown', event => {
        logPointerEvent(event);

        scheduleRepair('pointerdown', false);

    }, true);


    document.addEventListener('mousedown', event => {
        logPointerEvent(event);

        scheduleRepair('mousedown', false);

    }, true);


    document.addEventListener('mouseup', event => {
        logPointerEvent(event);

        scheduleRepair('mouseup', false);

    }, true);


    document.addEventListener('click', event => {
        logPointerEvent(event);

        /*
         * 모든 click은 scroller 재검사의 계기로 사용.
         */
        scheduleRepair('click', false);

        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        if (isInputElement(target)) {
            log('CLICK: input area → keep input focus');
            return;
        }

        if (isInteractiveElement(target)) {
            log(
                'CLICK: interactive element',
                describeElement(target),
                '→ not focusing scroller immediately'
            );

            /*
             * 사이드바에서 다른 채팅을 눌렀을 가능성이 높다.
             * 새 대화 DOM이 생길 때까지 적극적으로 재검사.
             */
            scheduleRepair(
                'interactive-click / possible navigation',
                false
            );

            return;
        }

        if (isConversationArea(target)) {
            log(
                'CLICK: conversation area → FORCE FOCUS'
            );

            /*
             * 바로 한번.
             */
            setTimeout(() => {
                focusScroller('conversation click 0ms');
            }, 0);

            /*
             * ChatGPT가 click 후 focus를 다시 가져가는 경우 보정.
             */
            setTimeout(() => {
                focusScroller('conversation click 30ms');
            }, 30);

            setTimeout(() => {
                focusScroller('conversation click 100ms');
            }, 100);

            setTimeout(() => {
                focusScroller('conversation click 250ms');
            }, 250);
        }

    }, true);


    // --------------------------------------------------
    // Focus events
    // --------------------------------------------------

    document.addEventListener('focusin', event => {

        log(
            'EVENT focusin',
            'target=', describeElement(event.target),
            'active=', describeElement(document.activeElement)
        );

        scheduleRepair('focusin', false);

    }, true);


    document.addEventListener('focusout', event => {

        log(
            'EVENT focusout',
            'target=', describeElement(event.target),
            'relatedTarget=',
            describeElement(event.relatedTarget),
            'active=', describeElement(document.activeElement)
        );

        scheduleRepair('focusout', false);

        /*
         * 특히 입력창에서 빠져나온 경우는
         * 새 포커스 위치가 결정된 뒤 다시 검사.
         */
        if (isInputElement(event.target)) {

            setTimeout(() => {

                const active =
                    document.activeElement;

                log(
                    'INPUT FOCUSOUT CHECK',
                    'active=', describeElement(active)
                );

                /*
                 * 다른 input/button으로 간 게 아니라면
                 * scroller로 포커스를 이동.
                 */
                if (
                    !isInputElement(active) &&
                    !isInteractiveElement(active)
                ) {
                    focusScroller(
                        'input focusout'
                    );
                }

            }, 0);
        }

    }, true);


    // --------------------------------------------------
    // Keyboard
    // --------------------------------------------------

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

        if (!keys.includes(event.key)) {
            return;
        }

        log(
            'EVENT keydown',
            'key=', JSON.stringify(event.key),
            'active=', describeElement(document.activeElement)
        );

        const active =
            document.activeElement;

        if (
            active &&
            isInputElement(active)
        ) {
            log(
                'KEYDOWN ignored: input has focus'
            );

            return;
        }

        /*
         * 실제 키 스크롤 직전에 무조건 현재 scroller를
         * 다시 찾고 focus.
         */
        const success =
            focusScroller(
                `keydown ${event.key}`
            );

        log(
            'KEYDOWN focus result=',
            success
        );

        /*
         * preventDefault 하지 않음.
         *
         * focus가 성공했다면 browser native scroll이
         * 그대로 처리한다.
         */

    }, true);


    // --------------------------------------------------
    // SPA route detection
    // --------------------------------------------------

    function routeChanged(reason) {

        log(
            'ROUTE CHANGE',
            reason,
            'url=', location.href
        );

        scheduleRepair(
            'route-change: ' + reason,
            false
        );
    }

    const originalPushState =
        history.pushState;

    history.pushState = function (...args) {

        const result =
            originalPushState.apply(
                this,
                args
            );

        routeChanged('pushState');

        return result;
    };


    const originalReplaceState =
        history.replaceState;

    history.replaceState = function (...args) {

        const result =
            originalReplaceState.apply(
                this,
                args
            );

        routeChanged('replaceState');

        return result;
    };


    window.addEventListener(
        'popstate',
        () => routeChanged('popstate')
    );


    /*
     * Next/React router가 history hook을 우회하는 경우까지
     * 확인하기 위한 아주 가벼운 fallback.
     */
    setInterval(() => {

        if (location.href === lastHref) {
            return;
        }

        const oldHref = lastHref;

        lastHref = location.href;

        log(
            'URL POLL CHANGE',
            'from=', oldHref,
            'to=', lastHref
        );

        routeChanged('URL poll');

    }, 250);


    // --------------------------------------------------
    // Initial boot
    // --------------------------------------------------

    function boot() {

        if (!document.body) {

            requestAnimationFrame(boot);

            return;
        }

        log(
            'BOOT',
            'url=', location.href
        );

        scheduleRepair(
            'initial boot',
            false
        );
    }

    boot();

})();
