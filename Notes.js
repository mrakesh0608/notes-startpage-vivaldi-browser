function makeOrdable(target, cb) {

    const lis = target.querySelectorAll("li");

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
                return { ds, ...orderable };
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

            li.parentNode.addEventListener("drop", (evt) => evt.preventDefault(), { once: true });
            li.addEventListener("dragend", (evt) => {
                evt.preventDefault();

                console.warn("reorder ending");
                li.classList.remove("selected");

                const { closest, intent } = stop();
                if (intent === INTENT_BEFORE) {
                    closest.insertAdjacentElement("beforebegin", li);
                } else {
                    closest.insertAdjacentElement("afterend", li);
                }

                cb(); //callback function after dragend
            }, { once: true });
        });
    });
}

async function updateReorderdList() {
    const notes = await getNotesFromStorage();
    let newNotes = [];
    document.getElementById('list').querySelectorAll('li').forEach(async (li) => {
        const note = await notes.filter(i => i._id === li.id)
        newNotes = newNotes.concat(note);
        // document.getElementById('quoteText').innerHTML = newNotes.length;

        if (newNotes.length === notes.length) chrome.storage.local.set({ myNotes: newNotes });
    });
}

const timeHourMin = () => {
    return new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    })
}

// gets all notes from storage and fails more nicely with an empty array
async function getNotesFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["myNotes"], function (result) {
            if (result["myNotes"]) resolve(result["myNotes"])
            else resolve([]);
        });
    });
}

async function addNewNotes(text) {
    return new Promise(async (resolve) => {
        let newNotes = [{
            _id: timeHourMin(),
            text,
            isChecked: false
        }];

        const oldNotes = await getNotesFromStorage();
        const allNotes = oldNotes.concat(newNotes);

        chrome.storage.local.set({ myNotes: allNotes });

        const quote = document.getElementById('quoteText').innerHTML;
        document.getElementById('quoteText').innerHTML = 'New note added';
        showSuccessEleColor(document.getElementById('quoteText'));

        setTimeout(() => {
            document.getElementById('quoteText').innerHTML = quote;
        }, 2000);

        resolve(allNotes);
    });
}

async function updateNote(note) {
    return new Promise(async (resolve) => {
        const notes = await getNotesFromStorage();
        objIndex = notes.findIndex((obj => obj._id === note._id));
        // document.getElementById('quoteText').innerHTML = 'in ' + note._id + note.text;

        notes[objIndex].isChecked = !note.isChecked;

        chrome.storage.local.set({ myNotes: [...notes] });

        resolve(notes);
    });
}

async function removeNoteById(id) {
    return new Promise(async (resolve) => {
        const notes = await getNotesFromStorage();
        const uNotes = notes.filter((obj => obj._id !== id));

        chrome.storage.local.set({ myNotes: [...uNotes] });
        resolve(uNotes);
    });
}

function myBeautifulTextArea() {
    const txHeight = 30;
    const tx = document.getElementsByTagName("textarea");

    for (let i = 0; i < tx.length; i++) {
        if (tx[i].value == '') {
            tx[i].setAttribute("style", "height:" + txHeight + "px;overflow-y:hidden;");
        } else {
            tx[i].setAttribute("style", "height:" + (tx[i].scrollHeight) + "px;overflow-y:hidden;");
        }
        tx[i].addEventListener("input", OnInput, false);
    }

    function OnInput(e) {
        this.style.height = 0;
        this.style.height = (this.scrollHeight) + "px";
    }
}

function showSuccess(element) {
    element.classList.add("successFill");
    setTimeout(function () {
        element.classList.remove("successFill");
        element.blur();
    }, 700);
}
function showSuccessEleColor(element) {
    element.classList.add("successColor");
    setTimeout(function () {
        element.classList.remove("successColor");
        element.blur();
    }, 2000);
}
function AddFormVisible({ toggle }) {
    chrome.storage.local.get(["hideMyNotes"], (res) => {
        const flag = res["hideMyNotes"] ? true : false;

        if (toggle) {
            if (flag) showAddForm();
            else hideAddForm();
        }
        else {
            if (flag) hideAddForm();
            else showAddForm();
        }

    });
}
function initNotes() {
    renderNotes();

    document.getElementById('submit-btn').addEventListener('click', addEvent);
    myBeautifulTextArea();

    // AddFormVisible({ toggle: false });

    window.onkeydown = function (e) {
        if (e.key.toLowerCase() === 'q' && e.ctrlKey) {
            AddFormVisible({ toggle: true });
        }
    }
}