import {
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router';
import Menu from './components/Menu';
import Settings from './components/Settings';
import PoemInfo from './components/PoemInfo';
import GameScreen from './components/GameScreen';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Menu,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
});

const poemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/poem',
  component: PoemInfo,
});

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game',
  component: GameScreen,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute,
  poemRoute,
  gameRoute,
]);
