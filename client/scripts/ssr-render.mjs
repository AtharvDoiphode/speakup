// Test helper, loaded through Vite's SSR runner so React, the router and the components share one copy
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export const render = (Component, props) => renderToString(React.createElement(MemoryRouter, null, React.createElement(Component, props)));
