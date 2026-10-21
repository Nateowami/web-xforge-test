/**
 * Class that AppComponent sets on the CDK overlay container while the navigation drawer is open over the page content
 * (narrow screens). The overlay container is always painted above the drawer.
 */
export const MENU_DRAWER_OVER_CONTENT_CLASS = 'menu-drawer-over-content';

/**
 * Panel class for overlays without a backdrop, such as bottom sheets, that should be hidden while the drawer is open
 * over the page content rather than cover its menu items. See the matching rule in styles.scss.
 */
export const HIDE_UNDER_MENU_DRAWER_PANEL_CLASS = 'hide-under-menu-drawer';
