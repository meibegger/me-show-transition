# meShowTransition #

meShowTransition is a highly customizable script to enable CSS transitions on toggle of the `display` property.

## Background ##
It is not possible to toggle the `display` property of an element (for instance from `none` to `block`) and apply transitions in one step.
So many developers use `opacity` or similar properties to show/hide elements and be able to enhance user experience by applying fancy transitions.

But this leads to accessibility problems, because seemingly hidden elements are still available for screen-readers and can be focused by keyboard-navigation.

## Usage ##

### 1. Include the JavaScript ###
#### Bundled & minified versions ####

meShowTransition depends on [meTools](https://github.com/meibegger/me-tools).

It also uses `Element.classList` and `Window.requestAnimationFrame`, so you need to include a polyfill if you need to support IE9 (see [http://caniuse.com/#feat=classlist](http://caniuse.com/#feat=classlist) and [http://caniuse.com/#feat=requestanimationframe](http://caniuse.com/#feat=requestanimationframe)), which you can find at [mePolyfills](https://github.com/meibegger/me-polyfills) in the sources-folder.

- Either include all the dependencies yourself and include `me-show-transition.min.js` from the `dist` folder in your HTML page.
- or use one of the standalone bundles `me-show-transition.bundle.min.js` or `me-show-transition.bundle.ie9.min.js`.

#### Source versions ####
You can find the original JavaScript file in the `src` folder of this package.

#### AMD ####
meShowTransition has AMD support. This allows it to be lazy-loaded with an AMD loader, such as RequireJS.

### 2. Use meShowTransition ###

meShowTransition is initialized on the container you want to show/hide.

By default the widget will add the following classes to the container:

- `me-shown` while the container is shown and ready for any transitions
- `me-show` during the 'show' transition
- `me-hide` during the 'hide' transition

Define your CSS transitions. For example:

```css
#example-container.me-shown {
  transform: translate(0,0);
}
#example-container,
#example-container.me-hide {
  transition: transform .5s ease 0s;
  transform: translate(-100%,0);
}
```

Initialize meShowTransition

```javascript
/**
 * Create a new instance
 * @param container mixed; id or element; the container in which the focus should be maintained
 * @param show boolean; optional; show the container immediately (without transitions) onInit; default is false
 * @param options object; optional; overwrite the default options
 */
var myShowTransition = new meShowTransition(container [,show] [,options])
```

To show the container, call

```javascript
myShowTransition.show(); // show with transition
myShowTransition.show(true); // show immediately (without transition)
```

To hide the container, call

```javascript
myShowTransition.hide(); // hide with transition
myShowTransition.hide(true); // hide immediately (without transition)
```

To destroy the instance, call
 
```javascript
myShowTransition = myShowTransition.destroy();
```

### Customize ###

#### Default options ####

```javascript
{
  callbacks: { // false or fn(params); params = {container: CONTAINER,immediate:BOOL (immediate show/hide call - no transition)}
    beforeShow: false,
    beforeShowTransition: false,
    afterShowTransition: false,
    afterShow: false,
    beforeHide: false,
    beforeHideTransition: false,
    afterHideTransition: false,
    afterHide: false
  },
  transitionEndElement: false, // element to listen to the transitionend event on (default is the container); use this if you use transitions on more than 1 element on show/hide to define the element which ends the transitions
  transitionMaxTime: 500, // ms; timeout to end the show/hide transition states in case the transitionEnd event doesn't fire; set to 0 to not support transition
  indicators: { // classes added to mark states
    shown: 'me-shown', // set to the container as long as it is shown
    show: 'me-show', // set to the container during the show-transition
    hide: 'me-hide' // set to the container during the hide-transition
  }
}
```

## Package managers ##
You can install meShowTransition using npm.

```
$ npm install me-show-transition
```

## License ##
meShowTransition is licenses under the [MIT licence](https://opensource.org/licenses/MIT).