import React from 'react';
import { createRoot } from 'react-dom/client';
import { createRootRoute, createRoute, createRouter, RouterProvider, Outlet } from '@tanstack/react-router';
import { DanceHome, DanceDirectory, DanceTemplatePage, DancePricing, DanceShell } from '../src/blocks/dance-site';
const root = createRootRoute({ component: Outlet });
const routes = [
  createRoute({ getParentRoute: () => root, path: '/', component: DanceHome }),
  createRoute({ getParentRoute: () => root, path: '/templates', component: DanceDirectory }),
  createRoute({ getParentRoute: () => root, path: '/templates/love-options-dance', component: () => <DanceTemplatePage slug="love-options-dance" /> }),
  createRoute({ getParentRoute: () => root, path: '/templates/stateside-dance', component: () => <DanceTemplatePage slug="stateside-dance" /> }),
  createRoute({ getParentRoute: () => root, path: '/pricing', component: DancePricing }),
  createRoute({ getParentRoute: () => root, path: '$', component: () => <DanceShell><section className="dance-hero"><h1>UI preview</h1><p>This preview includes the homepage, templates and pricing. Account and legal pages are available only in the full application.</p></section></DanceShell> }),
];
const router = createRouter({ routeTree: root.addChildren(routes) });
createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
