import { useState } from 'react';
import { saveDarkMode } from '../utils/StorageUtils';

export function useDarkMode() {
  const getInvertValue = () => {
    if (document.querySelector("html").style.filter == "invert(1)") {
      saveDarkMode(false);
      return false;
    } else {
      saveDarkMode(true);
      return true;
    }
  }
  const [darkMode, setDarkMode] = useState(getInvertValue());

  function toggleDarkMode() {
    console.log('Toggle DarkMode');
    setDarkMode(!darkMode);
    saveDarkMode(darkMode);
    document.querySelector("html").style.filter = "invert("+Number(darkMode)+")"
    //modify the css of class emoticons to invert the colors directly in stylesheets
    //edit stylesheet
    let stylesheets = document.styleSheets
    let stylesheet = Array.from(stylesheets).filter(stylesheet => stylesheet.ownerNode.attributes[1].nodeValue.includes("message"));
    console.log(stylesheet);
    //get the class emoticons
    let emoticons = Array.from(stylesheet[0].cssRules).filter(rule => rule.selectorText.includes("emoticons"));
    console.log(emoticons);
    //get the filter property
    let filter = emoticons[0].style.filter;
    console.log(filter);
    //invert the filter
    if (filter == "invert(0)") {
      emoticons[0].style.filter = "invert(1)";
    } else {
      emoticons[0].style.filter = "invert(0)";
    }
  }

  return [toggleDarkMode];
}
