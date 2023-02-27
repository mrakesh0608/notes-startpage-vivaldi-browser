const ul = document.querySelector("ul#groceries");
const lis = ul.querySelectorAll("li");

// Compute the centroid of an element in _page_ coordinates
// (from the top-left of the page, accounting for the scroll).
// We need to account for the scroll here because it is not only possible,
// but actually _used_ by many that with long lists you can scroll while
// you drag - pick an item, focus over the destination drop area and then scroll
// using the wheel to "reposition" the area for your drop. Check this out, really -
// it works like this in native macOS controls since ages.
//
// Also, one of the very good indications of web-engine based apps posing as native:
// scroll-during-drag not working correctly. We will not be like those apps.
function computeCentroid(element) {
  const rect = element.getBoundingClientRect();
  const viewportX = (rect.left + rect.right) / 2;
  const viewportY = (rect.top + rect.bottom) / 2;
  return { x: viewportX + window.scrollX, y: viewportY + window.scrollY };
}

function distanceSquaredBetweenCursorAndPoint(evt, centroid) {
  return (
    Math.pow(centroid.x - evt.clientX - window.scrollX, 2) +
    Math.pow(centroid.y - evt.clientY - window.scrollY, 2)
  );
}

const INTENT_BEFORE = Symbol("INTENT_BEFORE");
const INTENT_AFTER = Symbol("INTENT_AFTER");
const DIRECTION_HORIZONTAL = Symbol("DIRECTION_HORIZONTAL");
const DIRECTION_VERTICAL = Symbol("DIRECTION_VERTICAL");

function predictDirection(a, b) {
  if (!a || !b) return DIRECTION_HORIZONTAL;
  const dx = Math.abs(b.centroid.x - a.centroid.x);
  const dy = Math.abs(b.centroid.y - a.centroid.y);
  return dx > dy ? DIRECTION_HORIZONTAL : DIRECTION_VERTICAL;
}

function intentFrom(direction, evt, centroid) {
  if (direction === DIRECTION_HORIZONTAL) {
   if ((evt.clientX + window.scrollX) < centroid.x) {
     return INTENT_BEFORE;
   }
  } else {
   if ((evt.clientY + window.scrollY) < centroid.y) {
     return INTENT_BEFORE;
   }
  }
  return INTENT_AFTER;
}

function startReorderWithElement(el, { debug }) {
  const parent = el.parentNode;
  const orderables = Array.from(parent.children).map((element, i) => {
    return { i, element, centroid: computeCentroid(element) };
  });

  // Determine the dominant direction in the list - is it horizontal or vertical?
  const direction = predictDirection(orderables[0], orderables[1]);

  let closest = el;
  let intent = INTENT_AFTER;
  let marker = document.createElement(el.nodeName);
  marker.classList.add("insertion-marker");

  const unstyle = () => {
    orderables.forEach(({ element }) => {
      element.classList.remove("reorder-accepts-before");
      element.classList.remove("reorder-accepts-after");
    });
  };

  const mouseMoveHandler = (evt) => {
    evt.preventDefault();

    const byDistance = orderables.map((orderable) => {
      const ds = distanceSquaredBetweenCursorAndPoint(evt, orderable.centroid);
      return {ds, ...orderable};
     }).sort((a, b) => a.ds - b.ds);

    closest = byDistance[0].element;
    intent = intentFrom(direction, evt, byDistance[0].centroid);

    unstyle();
    marker.remove();

    if (intent === INTENT_BEFORE) {
      marker = closest.insertAdjacentElement("beforebegin", marker);
      closest.classList.add("reorder-accepts-before");
    } else {
      marker = closest.insertAdjacentElement("afterend", marker);
      closest.classList.add("reorder-accepts-after");
    }
  };
  parent.addEventListener("dragover", mouseMoveHandler);

  const stopFn = () => {
    unstyle();
    marker.remove();
    parent.removeEventListener("dragover", mouseMoveHandler);
    return { closest, intent };
  };

  return stopFn;
}

lis.forEach((li) => {
  li.addEventListener("dragstart", (evt) => {
    console.warn("reorder started");
    li.classList.add("selected");
    const stop = startReorderWithElement(li, { debug: true });

    li.parentNode.addEventListener("drop", (evt) => evt.preventDefault(), {
      once: true
    });
    li.addEventListener(
      "dragend",
      (evt) => {
        evt.preventDefault();

        console.warn("reorder ending");
        li.classList.remove("selected");

        const { closest, intent } = stop();
        if (intent === INTENT_BEFORE) {
          closest.insertAdjacentElement("beforebegin", li);
        } else {
          closest.insertAdjacentElement("afterend", li);
        }
      },
      { once: true }
    );
  });
});