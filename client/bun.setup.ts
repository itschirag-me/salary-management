import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

const { window } = dom;

// Install DOM globals onto Bun's global scope
(global as any).window = window;
(global as any).document = window.document;
(global as any).navigator = window.navigator;
(global as any).location = window.location;
(global as any).history = window.history;
(global as any).HTMLElement = window.HTMLElement;
(global as any).Element = window.Element;
(global as any).Node = window.Node;
(global as any).NodeList = window.NodeList;
(global as any).Event = window.Event;
(global as any).CustomEvent = window.CustomEvent;
(global as any).MouseEvent = window.MouseEvent;
(global as any).KeyboardEvent = window.KeyboardEvent;
(global as any).MutationObserver = window.MutationObserver;
(global as any).getComputedStyle = window.getComputedStyle.bind(window);
(global as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
(global as any).cancelAnimationFrame = clearTimeout;

import '@testing-library/jest-dom';
