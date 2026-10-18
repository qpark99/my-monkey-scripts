// ==UserScript==
// @name         ChatGPT Force GPT-5.6 High
// @namespace    local.chatgpt.force-56-high
// @version      1.0
// @description  Always use GPT-5.6 Sol High in ChatGPT
// @match        https://chatgpt.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @noframes
// ==/UserScript==

(() => {
    'use strict';

    const MODEL = 'gpt-5-6-thinking';
    const EFFORT = 'extended'; // High

    const PICKER_KEY =
        'codex:persisted-atom:chatgpt-last-selected-model-v1';

    const realFetch = window.fetch.bind(window);

    // 새 페이지가 열릴 때 UI 선택 상태도 5.6 High로 맞춘다.
    function forceLocalState() {
        const model = {
            model: MODEL,
            effort: EFFORT
        };

        localStorage.setItem(
            PICKER_KEY,
            JSON.stringify({
                slug: MODEL,
                thinkingEffort: EFFORT
            })
        );

        document.cookie =
            'oai-last-model-config=' +
            encodeURIComponent(JSON.stringify(model)) +
            '; path=/; SameSite=Lax';
    }

    forceLocalState();

    window.fetch = async function(input, init = {}) {

        const rawUrl =
            typeof input === 'string'
                ? input
                : input instanceof Request
                    ? input.url
                    : String(input);

        const url = new URL(rawUrl, location.href);

        const method = (
            init.method ||
            (input instanceof Request ? input.method : 'GET')
        ).toUpperCase();


        // ─────────────────────────────
        // 새 채팅 초기화
        // ─────────────────────────────
        if (
            method === 'POST' &&
            url.pathname === '/backend-api/conversation/init' &&
            typeof init.body === 'string'
        ) {
            try {
                const body = JSON.parse(init.body);

                body.requested_default_model = MODEL;
                init.body = JSON.stringify(body);

                const response = await realFetch(input, init);

                try {
                    const data = await response.clone().json();

                    data.default_model_slug = MODEL;
                    data.intended_default_model_slug = MODEL;

                    return new Response(JSON.stringify(data), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch {
                    return response;
                }

            } catch (e) {
                console.warn('[GPT-5.6 Lock] init error', e);
            }
        }


        // ─────────────────────────────
        // 실제 메시지 전송
        // ─────────────────────────────
        if (
            method === 'POST' &&
            url.pathname === '/backend-api/f/conversation' &&
            typeof init.body === 'string'
        ) {
            try {
                const body = JSON.parse(init.body);

                const serverDefault = body.model;

                body.model = MODEL;
                body.thinking_effort = EFFORT;

                if (serverDefault !== MODEL) {
                    body.requested_default_model = serverDefault;
                    body.one_off_model_override = true;
                }

                init.body = JSON.stringify(body);

                console.debug(
                    '[GPT-5.6 Lock]',
                    MODEL,
                    EFFORT
                );

            } catch (e) {
                console.warn('[GPT-5.6 Lock] send error', e);
            }
        }

        return realFetch(input, init);
    };

})();
